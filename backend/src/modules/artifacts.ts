import * as fs from "fs";
import * as path from "path";
import { logger } from "../middleware/logger";

/**
 * Artifacts module — loads pre-compiled contract ABI + bytecode from disk.
 * Backend NEVER compiles contracts. Only loads from the exported artifacts.
 */

export interface ContractArtifact {
    contractName: string;
    abi: unknown[];
    bytecode: string;
}

const ARTIFACTS_DIR = path.resolve(__dirname, "../../artifacts");
const cache = new Map<string, ContractArtifact>();

// Approved template types — only these can be deployed
const APPROVED_TEMPLATES = new Set([
    "ERC20Token",
    "ERC721NFT",
    "RewardDistributor",
    "DeploymentFactory",
]);

/**
 * Load an artifact by contract name. Cached after first load.
 */
export function loadArtifact(contractName: string): ContractArtifact {
    if (!APPROVED_TEMPLATES.has(contractName)) {
        throw new Error(`Template "${contractName}" is not approved for deployment`);
    }

    if (cache.has(contractName)) {
        return cache.get(contractName)!;
    }

    const artifactPath = path.join(ARTIFACTS_DIR, `${contractName}.json`);

    if (!fs.existsSync(artifactPath)) {
        throw new Error(
            `Artifact not found: ${artifactPath}. Run 'npm run export' in /contracts first.`
        );
    }

    const raw = fs.readFileSync(artifactPath, "utf-8");
    const artifact: ContractArtifact = JSON.parse(raw);

    // Validate artifact structure
    if (!artifact.abi || !artifact.bytecode) {
        throw new Error(`Invalid artifact for ${contractName}: missing abi or bytecode`);
    }

    cache.set(contractName, artifact);
    logger.info(`Loaded artifact: ${contractName}`);
    return artifact;
}

/**
 * Get list of approved template names.
 */
export function getApprovedTemplates(): string[] {
    return Array.from(APPROVED_TEMPLATES);
}

/**
 * Check if a template is approved.
 */
export function isApprovedTemplate(contractName: string): boolean {
    return APPROVED_TEMPLATES.has(contractName);
}

/**
 * Preload all approved artifacts into cache. Call at startup.
 */
export function preloadArtifacts(): void {
    let loaded = 0;
    for (const name of APPROVED_TEMPLATES) {
        try {
            loadArtifact(name);
            loaded++;
        } catch (err) {
            logger.warn(`Could not preload artifact: ${name}`, {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    logger.info(`Preloaded ${loaded}/${APPROVED_TEMPLATES.size} contract artifacts`);
}
