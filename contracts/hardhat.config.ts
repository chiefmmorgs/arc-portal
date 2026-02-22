import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

try { require("dotenv").config(); } catch { }


const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        arcTestnet: {
            url: process.env.ALCHEMY_RPC || "https://arc-testnet.g.alchemy.com/v2/FNzJDOWKoN8fHNgIwXZIdghzqJvpaIKR",
            chainId: 5042002,
            accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
        },
    },
    etherscan: {
        apiKey: {
            arcTestnet: "empty", // Blockscout doesn't need a real API key
        },
        customChains: [
            {
                network: "arcTestnet",
                chainId: 5042002,
                urls: {
                    apiURL: "https://testnet.arcscan.app/api",
                    browserURL: "https://testnet.arcscan.app",
                },
            },
        ],
    },
    sourcify: {
        enabled: false, // Use Blockscout verification instead
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};

export default config;
