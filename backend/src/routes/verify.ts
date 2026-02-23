import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { logger } from "../middleware/logger";

interface BlockscoutResponse {
    status?: string;
    message?: string;
    result?: string;
}

const router = Router();

const BLOCKSCOUT_API = "https://testnet.arcscan.app/api";
const COMPILER_VERSION = "v0.8.24+commit.e11b9ed9";

// Path to Hardhat contracts project (sibling to backend)
const CONTRACTS_DIR = path.resolve(process.cwd(), "../contracts");
const BUILD_INFO_DIR = path.join(CONTRACTS_DIR, "artifacts", "build-info");

// Map contract types to their Solidity file + contract name
const CONTRACT_MAP: Record<string, { file: string; name: string }> = {
    ERC20Token: { file: "contracts/ERC20Token.sol", name: "ERC20Token" },
    ERC721NFT: { file: "contracts/ERC721NFT.sol", name: "ERC721NFT" },
    RewardDistributor: { file: "contracts/RewardDistributor.sol", name: "RewardDistributor" },
    DeploymentFactory: { file: "contracts/DeploymentFactory.sol", name: "DeploymentFactory" },
};

/**
 * POST /api/deploy/verify
 * Verify a deployed contract on Blockscout via their HTTP API.
 */
router.post("/verify", async (req: Request, res: Response) => {
    try {
        const { contractAddress, contractType, constructorArgs } = req.body;

        if (!contractAddress || !contractType) {
            res.status(400).json({ error: "Missing contractAddress or contractType" });
            return;
        }

        const contractInfo = CONTRACT_MAP[contractType];
        if (!contractInfo) {
            res.status(400).json({
                error: `Unknown contract type: ${contractType}`,
                available: Object.keys(CONTRACT_MAP),
            });
            return;
        }

        logger.info("Starting contract verification", { contractAddress, contractType });

        // Try Standard JSON Input verification first (most reliable)
        const buildInfoResult = await verifyViaStandardInput(contractAddress, contractInfo);
        if (buildInfoResult.verified) {
            res.json(buildInfoResult);
            return;
        }

        // Fallback: try flattened source verification
        const flatResult = await verifyViaFlattenedSource(
            contractAddress,
            contractInfo,
            constructorArgs || []
        );
        res.json(flatResult);
    } catch (err: any) {
        const msg = err.message || String(err);
        if (msg.includes("already verified") || msg.includes("Already Verified")) {
            res.json({
                verified: true,
                message: "Contract is already verified",
                explorerUrl: `https://testnet.arcscan.app/address/${req.body.contractAddress}#code`,
            });
            return;
        }
        logger.error("Contract verification failed", { error: msg });
        res.status(500).json({ verified: false, error: msg });
    }
});

/**
 * Verify using the Hardhat build-info (Standard JSON Input).
 * This is the most reliable method as it includes exact compiler settings.
 */
async function verifyViaStandardInput(
    contractAddress: string,
    contractInfo: { file: string; name: string }
): Promise<{ verified: boolean; message: string; explorerUrl?: string }> {
    try {
        // Find the build-info JSON file
        if (!fs.existsSync(BUILD_INFO_DIR)) {
            return { verified: false, message: "No build-info directory found" };
        }

        const buildFiles = fs.readdirSync(BUILD_INFO_DIR).filter((f) => f.endsWith(".json"));
        if (buildFiles.length === 0) {
            return { verified: false, message: "No build-info files found" };
        }

        // Read the latest build-info
        const buildInfoPath = path.join(BUILD_INFO_DIR, buildFiles[buildFiles.length - 1]);
        const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));

        // Extract the standard JSON input
        const standardInput = buildInfo.input;
        if (!standardInput) {
            return { verified: false, message: "No standard input in build-info" };
        }

        // Submit to Blockscout's standard-input verification endpoint
        const fqn = `${contractInfo.file}:${contractInfo.name}`;

        const params = new URLSearchParams({
            module: "contract",
            action: "verifysourcecode",
            contractaddress: contractAddress,
            sourceCode: JSON.stringify(standardInput),
            codeformat: "solidity-standard-json-input",
            contractname: fqn,
            compilerversion: COMPILER_VERSION,
            constructorArguements: "", // Blockscout extracts from bytecode
        });

        const response = await fetch(BLOCKSCOUT_API, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        const data = (await response.json()) as BlockscoutResponse;

        if (data.status === "1" || data.message === "OK") {
            // May return a GUID for async verification
            if (data.result && data.result.length > 20) {
                return await pollVerificationStatus(data.result, contractAddress);
            }
            return {
                verified: true,
                message: "Contract verified on Blockscout!",
                explorerUrl: `https://testnet.arcscan.app/address/${contractAddress}#code`,
            };
        }

        logger.warn("Standard input verification response", { data });
        return { verified: false, message: data.result || data.message || "Verification failed" };
    } catch (err: any) {
        logger.error("Standard input verification error", { error: err.message });
        return { verified: false, message: err.message };
    }
}

/**
 * Verify using flattened source code (fallback).
 */
async function verifyViaFlattenedSource(
    contractAddress: string,
    contractInfo: { file: string; name: string },
    constructorArgs: unknown[]
): Promise<{ verified: boolean; message: string; explorerUrl?: string }> {
    try {
        // Try to read the source file directly
        const sourcePath = path.join(CONTRACTS_DIR, contractInfo.file);
        if (!fs.existsSync(sourcePath)) {
            return { verified: false, message: `Source file not found: ${contractInfo.file}` };
        }

        const sourceCode = fs.readFileSync(sourcePath, "utf8");

        // ABI-encode constructor args if provided
        let encodedArgs = "";
        if (constructorArgs.length > 0) {
            try {
                const { ethers } = require("ethers");
                const coder = ethers.AbiCoder.defaultAbiCoder();
                const argTypes: Record<string, string[]> = {
                    ERC20Token: ["string", "string", "uint8", "uint256", "address"],
                    ERC721NFT: ["string", "string", "uint256", "string", "uint96", "address"],
                    RewardDistributor: ["address", "address"],
                    DeploymentFactory: ["address"],
                };
                const types = argTypes[contractInfo.name] || [];
                if (types.length > 0) {
                    encodedArgs = coder.encode(types, constructorArgs).slice(2);
                }
            } catch {
                logger.warn("Could not encode constructor args");
            }
        }

        const params = new URLSearchParams({
            module: "contract",
            action: "verifysourcecode",
            contractaddress: contractAddress,
            sourceCode: sourceCode,
            codeformat: "solidity-single-file",
            contractname: contractInfo.name,
            compilerversion: COMPILER_VERSION,
            optimizationUsed: "1",
            runs: "200",
            constructorArguements: encodedArgs,
            evmversion: "paris",
            licenseType: "3",
        });

        const response = await fetch(BLOCKSCOUT_API, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        const data = (await response.json()) as BlockscoutResponse;

        if (data.status === "1" || data.message === "OK") {
            if (data.result && data.result.length > 20) {
                return await pollVerificationStatus(data.result, contractAddress);
            }
            return {
                verified: true,
                message: "Contract verified on Blockscout!",
                explorerUrl: `https://testnet.arcscan.app/address/${contractAddress}#code`,
            };
        }

        return { verified: false, message: data.result || data.message || "Verification failed" };
    } catch (err: any) {
        return { verified: false, message: err.message };
    }
}

/**
 * Poll Blockscout for async verification result.
 */
async function pollVerificationStatus(
    guid: string,
    contractAddress: string
): Promise<{ verified: boolean; message: string; explorerUrl?: string }> {
    for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));

        const response = await fetch(
            `${BLOCKSCOUT_API}?module=contract&action=checkverifystatus&guid=${guid}`
        );
        const data = (await response.json()) as BlockscoutResponse;

        if (data.result === "Pass - Verified") {
            logger.info("Contract verified successfully", { contractAddress });
            return {
                verified: true,
                message: "Contract verified on Blockscout!",
                explorerUrl: `https://testnet.arcscan.app/address/${contractAddress}#code`,
            };
        }
        if (data.result && data.result.includes("Fail")) {
            // Check if Blockscout verified it anyway (bytecode database match)
            const isVerified = await checkIfVerified(contractAddress);
            if (isVerified) {
                return {
                    verified: true,
                    message: "Contract verified on Blockscout!",
                    explorerUrl: `https://testnet.arcscan.app/address/${contractAddress}#code`,
                };
            }
            return { verified: false, message: data.result };
        }
    }
    // Final check — Blockscout may have verified via bytecode database
    const isVerified = await checkIfVerified(contractAddress);
    if (isVerified) {
        logger.info("Contract verified via bytecode database", { contractAddress });
        return {
            verified: true,
            message: "Contract verified on Blockscout!",
            explorerUrl: `https://testnet.arcscan.app/address/${contractAddress}#code`,
        };
    }
    return { verified: false, message: "Verification timed out — check Blockscout manually" };
}

async function checkIfVerified(contractAddress: string): Promise<boolean> {
    try {
        const res = await fetch(
            `${BLOCKSCOUT_API}?module=contract&action=getsourcecode&address=${contractAddress}`
        );
        const data = (await res.json()) as any;
        if (data.result && Array.isArray(data.result) && data.result.length > 0) {
            return data.result[0].SourceCode && data.result[0].SourceCode.length > 0;
        }
        return false;
    } catch {
        return false;
    }
}

export default router;
