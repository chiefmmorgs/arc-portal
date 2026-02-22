import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { loadArtifact, getApprovedTemplates, isApprovedTemplate } from "../modules/artifacts";
import { prepareDeployTransaction, estimateGas, getGasPrice } from "../modules/rpc";
import { insertDeployment } from "../modules/db";
import { validateWalletSignature } from "../middleware/validateSig";
import { deployLimiter } from "../middleware/rateLimit";
import { logger } from "../middleware/logger";

const router = Router();

// Apply rate limiting and signature validation to all deploy routes
router.use(deployLimiter);

/**
 * GET /api/deploy/templates
 * List available contract templates.
 */
router.get("/templates", (_req: Request, res: Response) => {
    const templates = getApprovedTemplates().map((name) => {
        const descriptions: Record<string, string> = {
            ERC20Token: "Configurable ERC20 token with burnable + owner-only minting",
            ERC721NFT: "NFT collection with max supply, per-token URI, ERC2981 royalties",
            ValidatorRegistry: "On-chain validator registry with status management",
            RewardDistributor: "Epoch-based reward distribution system",
            DeploymentFactory: "Factory for deploying whitelisted template contracts",
        };
        return { name, description: descriptions[name] || "" };
    });
    res.json({ templates });
});

/**
 * POST /api/deploy/erc20
 * Prepare an ERC20 deployment transaction.
 *
 * Body: { name, symbol, decimals?, initialSupply, owner }
 * Headers: x-wallet-address, x-wallet-signature
 */
router.post("/erc20", validateWalletSignature, async (req: Request, res: Response) => {
    try {
        const { name, symbol, decimals = 18, initialSupply, owner } = req.body;

        // Validate required fields
        if (!name || !symbol || !initialSupply || !owner) {
            res.status(400).json({ error: "Missing required fields: name, symbol, initialSupply, owner" });
            return;
        }

        if (!ethers.isAddress(owner)) {
            res.status(400).json({ error: "Invalid owner address" });
            return;
        }

        const artifact = loadArtifact("ERC20Token");
        const constructorArgs = [name, symbol, decimals, initialSupply, owner];
        const deployData = await prepareDeployTransaction(artifact.abi as ethers.InterfaceAbi, artifact.bytecode, constructorArgs);

        // Estimate gas
        const gasEstimate = await estimateGas({ data: deployData, from: owner });
        const gasPrice = await getGasPrice();

        logger.info("ERC20 deployment prepared", {
            deployer: (req as any).verifiedAddress,
            name,
            symbol,
            initialSupply,
        });

        res.json({
            template: "ERC20Token",
            transaction: {
                data: deployData,
                gasEstimate: gasEstimate.toString(),
                gasPrice: gasPrice.toString(),
                chainId: 5042002,
            },
            constructorArgs,
        });
    } catch (err) {
        logger.error("ERC20 deploy preparation failed", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to prepare deployment" });
    }
});

/**
 * POST /api/deploy/erc721
 * Prepare an ERC721 deployment transaction.
 *
 * Body: { name, symbol, maxSupply, baseURI?, royaltyBps?, owner }
 */
router.post("/erc721", validateWalletSignature, async (req: Request, res: Response) => {
    try {
        const { name, symbol, maxSupply, baseURI = "", royaltyBps = 500, owner } = req.body;

        if (!name || !symbol || maxSupply === undefined || !owner) {
            res.status(400).json({ error: "Missing required fields: name, symbol, maxSupply, owner" });
            return;
        }

        if (!ethers.isAddress(owner)) {
            res.status(400).json({ error: "Invalid owner address" });
            return;
        }

        const artifact = loadArtifact("ERC721NFT");
        const constructorArgs = [name, symbol, maxSupply, baseURI, royaltyBps, owner];
        const deployData = await prepareDeployTransaction(artifact.abi as ethers.InterfaceAbi, artifact.bytecode, constructorArgs);

        const gasEstimate = await estimateGas({ data: deployData, from: owner });
        const gasPrice = await getGasPrice();

        logger.info("ERC721 deployment prepared", {
            deployer: (req as any).verifiedAddress,
            name,
            symbol,
            maxSupply,
        });

        res.json({
            template: "ERC721NFT",
            transaction: {
                data: deployData,
                gasEstimate: gasEstimate.toString(),
                gasPrice: gasPrice.toString(),
                chainId: 5042002,
            },
            constructorArgs,
        });
    } catch (err) {
        logger.error("ERC721 deploy preparation failed", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to prepare deployment" });
    }
});

/**
 * POST /api/deploy/rewards
 * Prepare a RewardDistributor deployment.
 *
 * Body: { rewardToken, owner }
 */
router.post("/rewards", validateWalletSignature, async (req: Request, res: Response) => {
    try {
        const { rewardToken, owner } = req.body;

        if (!rewardToken || !owner) {
            res.status(400).json({ error: "Missing required fields: rewardToken, owner" });
            return;
        }

        if (!ethers.isAddress(rewardToken) || !ethers.isAddress(owner)) {
            res.status(400).json({ error: "Invalid address format" });
            return;
        }

        const artifact = loadArtifact("RewardDistributor");
        const constructorArgs = [rewardToken, owner];
        const deployData = await prepareDeployTransaction(artifact.abi as ethers.InterfaceAbi, artifact.bytecode, constructorArgs);

        const gasEstimate = await estimateGas({ data: deployData, from: owner });
        const gasPrice = await getGasPrice();

        logger.info("RewardDistributor deployment prepared", {
            deployer: (req as any).verifiedAddress,
            rewardToken,
        });

        res.json({
            template: "RewardDistributor",
            transaction: {
                data: deployData,
                gasEstimate: gasEstimate.toString(),
                gasPrice: gasPrice.toString(),
                chainId: 5042002,
            },
            constructorArgs,
        });
    } catch (err) {
        logger.error("RewardDistributor deploy preparation failed", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to prepare deployment" });
    }
});

/**
 * POST /api/deploy/factory
 * Prepare a DeploymentFactory deployment.
 *
 * Body: { owner }
 */
router.post("/factory", validateWalletSignature, async (req: Request, res: Response) => {
    try {
        const { owner } = req.body;

        if (!owner || !ethers.isAddress(owner)) {
            res.status(400).json({ error: "Valid owner address required" });
            return;
        }

        const artifact = loadArtifact("DeploymentFactory");
        const constructorArgs = [owner];
        const deployData = await prepareDeployTransaction(artifact.abi as ethers.InterfaceAbi, artifact.bytecode, constructorArgs);

        const gasEstimate = await estimateGas({ data: deployData, from: owner });
        const gasPrice = await getGasPrice();

        logger.info("DeploymentFactory deployment prepared", {
            deployer: (req as any).verifiedAddress,
        });

        res.json({
            template: "DeploymentFactory",
            transaction: {
                data: deployData,
                gasEstimate: gasEstimate.toString(),
                gasPrice: gasPrice.toString(),
                chainId: 5042002,
            },
            constructorArgs,
        });
    } catch (err) {
        logger.error("DeploymentFactory deploy preparation failed", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to prepare deployment" });
    }
});

/**
 * POST /api/deploy/confirm
 * Store a confirmed deployment after the user has broadcast the transaction.
 *
 * Body: { contractAddress, deployer, contractType, txHash }
 */
router.post("/confirm", validateWalletSignature, async (req: Request, res: Response) => {
    try {
        const { contractAddress, deployer, contractType, txHash } = req.body;

        if (!contractAddress || !deployer || !contractType || !txHash) {
            res.status(400).json({
                error: "Missing fields: contractAddress, deployer, contractType, txHash",
            });
            return;
        }

        if (!isApprovedTemplate(contractType)) {
            res.status(400).json({ error: `Unknown contract type: ${contractType}` });
            return;
        }

        const result = await insertDeployment(contractAddress, deployer, contractType, txHash);

        logger.info("Deployment confirmed", {
            contractAddress,
            deployer,
            contractType,
            txHash,
        });

        res.json({ deployment: result.rows[0] });
    } catch (err) {
        logger.error("Deployment confirmation failed", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to store deployment" });
    }
});

export default router;
