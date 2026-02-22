const fs = require("fs");
const path = require("path");

const CONTRACTS = [
    "ERC20Token",
    "ERC721NFT",
    "RewardDistributor",
    "DeploymentFactory",
];

const ARTIFACTS_DIR = path.resolve(__dirname, "..", "artifacts", "contracts");
const OUTPUT_DIR = path.resolve(__dirname, "..", "..", "backend", "artifacts");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const name of CONTRACTS) {
    const artifactPath = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`);
    if (!fs.existsSync(artifactPath)) {
        console.error(`Artifact not found: ${artifactPath}`);
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const exported = {
        contractName: name,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
    };

    const outPath = path.join(OUTPUT_DIR, `${name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(exported, null, 2));
    console.log(`Exported ${name} -> ${outPath}`);
}

console.log(`\nAll artifacts exported to ${OUTPUT_DIR}`);
