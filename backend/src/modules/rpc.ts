import { ethers } from "ethers";
import { logger } from "../middleware/logger";

/**
 * RPC Module — Alchemy JSON-RPC provider for ARC testnet.
 * Read-only operations: block fetching, log querying, gas estimation.
 */

let provider: ethers.JsonRpcProvider;

export function initRPC(rpcUrl: string): ethers.JsonRpcProvider {
    provider = new ethers.JsonRpcProvider(rpcUrl, {
        name: "arc-testnet",
        chainId: 5042002,
    });
    logger.info("RPC provider initialized", { url: rpcUrl.replace(/\/[^/]+$/, "/***") });
    return provider;
}

export function getProvider(): ethers.JsonRpcProvider {
    if (!provider) throw new Error("RPC not initialized. Call initRPC() first.");
    return provider;
}

/**
 * Get the latest block number.
 */
export async function getLatestBlockNumber(): Promise<number> {
    return getProvider().getBlockNumber();
}

/**
 * Get a full block with transaction details.
 */
export async function getBlock(blockNumber: number): Promise<ethers.Block | null> {
    return getProvider().getBlock(blockNumber);
}

/**
 * Get logs matching a filter.
 */
export async function getLogs(filter: ethers.Filter): Promise<ethers.Log[]> {
    return getProvider().getLogs(filter);
}

/**
 * Estimate gas for a transaction.
 */
export async function estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    return getProvider().estimateGas(tx);
}

/**
 * Get current gas price.
 */
export async function getGasPrice(): Promise<bigint> {
    const feeData = await getProvider().getFeeData();
    return feeData.gasPrice ?? 0n;
}

/**
 * Get the network info.
 */
export async function getNetwork(): Promise<ethers.Network> {
    return getProvider().getNetwork();
}

/**
 * Prepare an unsigned deployment transaction from ABI + bytecode.
 * The user signs this client-side — we NEVER handle private keys.
 */
export async function prepareDeployTransaction(
    abi: ethers.InterfaceAbi,
    bytecode: string,
    constructorArgs: unknown[]
): Promise<string> {
    const factory = new ethers.ContractFactory(abi, bytecode);
    const deployTx = await factory.getDeployTransaction(...constructorArgs);
    return deployTx.data;
}

/**
 * Get chain ID for verification.
 */
export async function getChainId(): Promise<number> {
    const network = await getProvider().getNetwork();
    return Number(network.chainId);
}
