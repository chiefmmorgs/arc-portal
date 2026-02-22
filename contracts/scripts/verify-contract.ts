/**
 * Verify a deployed contract on the ARC Testnet Blockscout explorer.
 *
 * Usage:
 *   npx hardhat run scripts/verify-contract.ts --network arcTestnet
 *
 * Set these environment variables before running:
 *   CONTRACT_ADDRESS  — The deployed contract address
 *   CONTRACT_TYPE     — One of: ERC20Token, ERC721NFT, ValidatorRegistry, RewardDistributor, DeploymentFactory
 *   CONSTRUCTOR_ARGS  — JSON array of constructor arguments (e.g. '["MyToken","MTK",18,"1000000","0xOwner"]')
 */
import hre from "hardhat";

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractType = process.env.CONTRACT_TYPE;
    const rawArgs = process.env.CONSTRUCTOR_ARGS;

    if (!contractAddress || !contractType) {
        console.error("❌ Missing environment variables:");
        console.error("   CONTRACT_ADDRESS — The deployed contract address");
        console.error("   CONTRACT_TYPE    — E.g. ERC20Token, ERC721NFT");
        console.error("   CONSTRUCTOR_ARGS — JSON array of constructor args (optional)");
        console.error("");
        console.error("Example:");
        console.error('   CONTRACT_ADDRESS=0x... CONTRACT_TYPE=ArcERC20Token CONSTRUCTOR_ARGS=\'["MyToken","MTK",18,"1000000","0xOwner"]\' npx hardhat run scripts/verify-contract.ts --network arcTestnet');
        process.exit(1);
    }

    // Map short names to full contract paths
    const contractPaths: Record<string, string> = {
        ERC20Token: "ArcERC20Token",
        ArcERC20Token: "ArcERC20Token",
        ERC721NFT: "ArcERC721NFT",
        ArcERC721NFT: "ArcERC721NFT",
        ValidatorRegistry: "ValidatorRegistry",
        RewardDistributor: "RewardDistributor",
        DeploymentFactory: "DeploymentFactory",
    };

    const contract = contractPaths[contractType];
    if (!contract) {
        console.error(`❌ Unknown contract type: ${contractType}`);
        console.error(`   Available: ${Object.keys(contractPaths).join(", ")}`);
        process.exit(1);
    }

    let constructorArguments: unknown[] = [];
    if (rawArgs) {
        try {
            constructorArguments = JSON.parse(rawArgs);
        } catch {
            console.error("❌ Failed to parse CONSTRUCTOR_ARGS as JSON");
            process.exit(1);
        }
    }

    console.log("🔍 Verifying contract on Blockscout...");
    console.log(`   Address:  ${contractAddress}`);
    console.log(`   Contract: ${contract}`);
    console.log(`   Args:     ${JSON.stringify(constructorArguments)}`);
    console.log("");

    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments,
        });
        console.log("✅ Contract verified successfully!");
        console.log(`   View: https://testnet.arcscan.app/address/${contractAddress}#code`);
    } catch (err: any) {
        if (err.message.includes("Already Verified") || err.message.includes("already verified")) {
            console.log("ℹ️  Contract is already verified.");
        } else {
            console.error("❌ Verification failed:", err.message);
            process.exit(1);
        }
    }
}

main();
