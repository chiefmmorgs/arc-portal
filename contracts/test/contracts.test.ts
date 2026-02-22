import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ERC20Token", function () {
    async function deployFixture() {
        const [owner, addr1] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("ERC20Token");
        const token = await Token.deploy("ArcToken", "ARC", 18, 1000000, owner.address);
        return { token, owner, addr1 };
    }

    it("should deploy with correct name and symbol", async function () {
        const { token } = await loadFixture(deployFixture);
        expect(await token.name()).to.equal("ArcToken");
        expect(await token.symbol()).to.equal("ARC");
    });

    it("should mint initial supply to owner", async function () {
        const { token, owner } = await loadFixture(deployFixture);
        const expected = ethers.parseUnits("1000000", 18);
        expect(await token.balanceOf(owner.address)).to.equal(expected);
    });

    it("should allow owner to mint additional tokens", async function () {
        const { token, owner, addr1 } = await loadFixture(deployFixture);
        const amount = ethers.parseUnits("500", 18);
        await token.mint(addr1.address, amount);
        expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("should prevent non-owner from minting", async function () {
        const { token, addr1 } = await loadFixture(deployFixture);
        await expect(
            token.connect(addr1).mint(addr1.address, 100)
        ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should allow burning", async function () {
        const { token, owner } = await loadFixture(deployFixture);
        const burnAmount = ethers.parseUnits("100", 18);
        await token.burn(burnAmount);
        const expected = ethers.parseUnits("999900", 18);
        expect(await token.balanceOf(owner.address)).to.equal(expected);
    });
});

describe("ERC721NFT", function () {
    async function deployFixture() {
        const [owner, addr1] = await ethers.getSigners();
        const NFT = await ethers.getContractFactory("ERC721NFT");
        const nft = await NFT.deploy("ArcNFT", "ANFT", 100, "https://meta.arc/", 500, owner.address);
        return { nft, owner, addr1 };
    }

    it("should deploy with correct name and symbol", async function () {
        const { nft } = await loadFixture(deployFixture);
        expect(await nft.name()).to.equal("ArcNFT");
        expect(await nft.symbol()).to.equal("ANFT");
    });

    it("should mint a token with URI", async function () {
        const [owner, addr1] = await ethers.getSigners();
        // Deploy with empty baseURI so per-token URI is returned as-is
        const NFT = await ethers.getContractFactory("ERC721NFT");
        const nft = await NFT.deploy("ArcNFT", "ANFT", 100, "", 500, owner.address);
        await nft.mint(addr1.address, "ipfs://QmTest123");
        expect(await nft.ownerOf(0)).to.equal(addr1.address);
        expect(await nft.tokenURI(0)).to.equal("ipfs://QmTest123");
    });

    it("should enforce max supply", async function () {
        const [owner] = await ethers.getSigners();
        const NFT = await ethers.getContractFactory("ERC721NFT");
        const nft = await NFT.deploy("Limited", "LTD", 2, "", 0, owner.address);
        await nft.mint(owner.address, "uri1");
        await nft.mint(owner.address, "uri2");
        await expect(nft.mint(owner.address, "uri3")).to.be.revertedWith("Max supply reached");
    });

    it("should return correct royalty info", async function () {
        const { nft, owner } = await loadFixture(deployFixture);
        const [receiver, amount] = await nft.royaltyInfo(0, 10000);
        expect(receiver).to.equal(owner.address);
        expect(amount).to.equal(500); // 5% of 10000
    });

    it("should batch mint", async function () {
        const { nft, owner, addr1 } = await loadFixture(deployFixture);
        await nft.mintBatch(addr1.address, ["uri1", "uri2", "uri3"]);
        expect(await nft.balanceOf(addr1.address)).to.equal(3);
    });
});

describe("ValidatorRegistry", function () {
    async function deployFixture() {
        const [owner, val1, val2] = await ethers.getSigners();
        const Registry = await ethers.getContractFactory("ValidatorRegistry");
        const registry = await Registry.deploy(owner.address);
        return { registry, owner, val1, val2 };
    }

    it("should register a validator", async function () {
        const { registry, val1 } = await loadFixture(deployFixture);
        await registry.registerValidator(val1.address, "Validator-1");
        expect(await registry.validatorCount()).to.equal(1);
        expect(await registry.isActiveValidator(val1.address)).to.be.true;
    });

    it("should prevent duplicate registration", async function () {
        const { registry, val1 } = await loadFixture(deployFixture);
        await registry.registerValidator(val1.address, "Validator-1");
        await expect(
            registry.registerValidator(val1.address, "Duplicate")
        ).to.be.revertedWith("Already registered");
    });

    it("should deactivate and reactivate", async function () {
        const { registry, val1 } = await loadFixture(deployFixture);
        await registry.registerValidator(val1.address, "Validator-1");
        await registry.deactivateValidator(val1.address);
        expect(await registry.isActiveValidator(val1.address)).to.be.false;
        await registry.reactivateValidator(val1.address);
        expect(await registry.isActiveValidator(val1.address)).to.be.true;
    });

    it("should paginate validators", async function () {
        const { registry, val1, val2 } = await loadFixture(deployFixture);
        await registry.registerValidator(val1.address, "V1");
        await registry.registerValidator(val2.address, "V2");
        const page = await registry.getValidators(0, 10);
        expect(page.length).to.equal(2);
    });
});

describe("RewardDistributor", function () {
    async function deployFixture() {
        const [owner, validator] = await ethers.getSigners();
        // Deploy a mock ERC20 as the reward token
        const Token = await ethers.getContractFactory("ERC20Token");
        const token = await Token.deploy("Reward", "RWD", 18, 1000000, owner.address);
        const Distributor = await ethers.getContractFactory("RewardDistributor");
        const distributor = await Distributor.deploy(await token.getAddress(), owner.address);
        // Fund the distributor
        const fundAmount = ethers.parseUnits("10000", 18);
        await token.approve(await distributor.getAddress(), fundAmount);
        await distributor.fundRewards(fundAmount);
        return { distributor, token, owner, validator };
    }

    it("should allocate rewards", async function () {
        const { distributor, validator } = await loadFixture(deployFixture);
        const amount = ethers.parseUnits("100", 18);
        await distributor.allocateReward(validator.address, amount);
        const [rAmount, , claimed] = await distributor.getReward(validator.address, 1);
        expect(rAmount).to.equal(amount);
        expect(claimed).to.be.false;
    });

    it("should allow claiming", async function () {
        const { distributor, token, validator } = await loadFixture(deployFixture);
        const amount = ethers.parseUnits("100", 18);
        await distributor.allocateReward(validator.address, amount);
        await distributor.connect(validator).claimRewards();
        expect(await token.balanceOf(validator.address)).to.equal(amount);
    });

    it("should advance epoch", async function () {
        const { distributor } = await loadFixture(deployFixture);
        expect(await distributor.currentEpoch()).to.equal(1);
        await distributor.advanceEpoch();
        expect(await distributor.currentEpoch()).to.equal(2);
    });
});

describe("DeploymentFactory", function () {
    async function deployFixture() {
        const [owner, deployer] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("DeploymentFactory");
        const factory = await Factory.deploy(owner.address);
        return { factory, owner, deployer };
    }

    it("should approve and deploy template", async function () {
        const { factory, owner, deployer } = await loadFixture(deployFixture);

        // Get ERC20 bytecode for template approval
        const Token = await ethers.getContractFactory("ERC20Token");
        const creationCode = Token.bytecode;
        const templateHash = ethers.keccak256(creationCode);

        await factory.approveTemplate(templateHash, "ERC20");

        // Encode constructor args
        const encoded = Token.interface.encodeDeploy(["Test", "TST", 18, 1000, deployer.address]);
        const fullBytecode = ethers.concat([creationCode, encoded]);

        await factory.connect(deployer).deploy(fullBytecode, templateHash, "ERC20");
        expect(await factory.deploymentCount()).to.equal(1);

        const history = await factory.getDeployerHistory(deployer.address);
        expect(history.length).to.equal(1);
    });

    it("should reject unapproved templates", async function () {
        const { factory, deployer } = await loadFixture(deployFixture);
        const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake"));
        await expect(
            factory.connect(deployer).deploy("0x00", fakeHash, "FAKE")
        ).to.be.revertedWith("Template not approved");
    });

    it("should revoke templates", async function () {
        const { factory } = await loadFixture(deployFixture);
        const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
        await factory.approveTemplate(hash, "TEST");
        expect(await factory.approvedTemplates(hash)).to.be.true;
        await factory.revokeTemplate(hash);
        expect(await factory.approvedTemplates(hash)).to.be.false;
    });
});
