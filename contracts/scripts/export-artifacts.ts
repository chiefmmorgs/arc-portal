import * as fs from "fs";
import * as path from "path";

/**
 * Export compiled contract artifacts (ABI + bytecode) to the backend artifacts directory.
 * Run after `npx hardhat compile`.
 */

const CONTRACTS = [
    "ERC20Token",
    "ERC721NFT",
    "ValidatorRegistry",
    "RewardDistributor",
    "DeploymentFactory",
];

const ARTIFACTS_DIR = path.resolve(__dirname, "../artifacts/contracts");
const OUTPUT_DIR = path.resolve(__dirname, "../../backend/artifacts");

function main() {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let exported = 0;

    for (const name of CONTRACTS) {
        const artifactPath = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`);

        if (!fs.existsSync(artifactPath)) {
            console.error(`❌ Artifact not found: ${artifactPath}`);
            console.error(`   Run 'npx hardhat compile' first.`);
            process.exit(1);
        }

        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

        const output = {
            contractName: artifact.contractName,
            abi: artifact.abi,
            bytecode: artifact.bytecode,
        };

        const outputPath = path.join(OUTPUT_DIR, `${name}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`✅ Exported ${name} → ${outputPath}`);
        exported++;
    }

    console.log(`\n✅ Done. ${exported}/${CONTRACTS.length} artifacts exported to ${OUTPUT_DIR}`);
}

main();
