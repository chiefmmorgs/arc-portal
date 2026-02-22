// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeploymentFactory
 * @notice Factory contract that deploys approved template contracts.
 *         Tracks all deployments on-chain for the backend to index.
 *         Restricts deployment to whitelisted bytecode hashes.
 */
contract DeploymentFactory is Ownable {
    struct Deployment {
        address contractAddress;
        address deployer;
        string contractType;
        bytes32 bytecodeHash;
        uint256 timestamp;
    }

    // Whitelisted bytecode hashes (template safety)
    mapping(bytes32 => bool) public approvedTemplates;
    // All deployments
    Deployment[] public deployments;
    // deployer => their deployments
    mapping(address => uint256[]) public deployerHistory;

    event TemplateApproved(bytes32 indexed bytecodeHash, string contractType);
    event TemplateRevoked(bytes32 indexed bytecodeHash);
    event ContractDeployed(
        address indexed contractAddress,
        address indexed deployer,
        string contractType,
        bytes32 bytecodeHash
    );

    constructor(address owner_) Ownable(owner_) {}

    /**
     * @notice Approve a template bytecode hash for deployment. Owner-only.
     */
    function approveTemplate(bytes32 bytecodeHash, string calldata contractType) external onlyOwner {
        approvedTemplates[bytecodeHash] = true;
        emit TemplateApproved(bytecodeHash, contractType);
    }

    /**
     * @notice Revoke a previously approved template.
     */
    function revokeTemplate(bytes32 bytecodeHash) external onlyOwner {
        approvedTemplates[bytecodeHash] = false;
        emit TemplateRevoked(bytecodeHash);
    }

    /**
     * @notice Deploy a contract from approved bytecode.
     * @param bytecode        Full creation bytecode (template + constructor args)
     * @param templateHash    Hash of the template bytecode (without constructor args)
     * @param contractType    Human-readable contract type ("ERC20", "ERC721", etc.)
     */
    function deploy(
        bytes memory bytecode,
        bytes32 templateHash,
        string calldata contractType
    ) external returns (address deployed) {
        require(approvedTemplates[templateHash], "Template not approved");
        require(bytecode.length > 0, "Empty bytecode");

        assembly {
            deployed := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        require(deployed != address(0), "Deployment failed");

        uint256 idx = deployments.length;
        deployments.push(Deployment({
            contractAddress: deployed,
            deployer: msg.sender,
            contractType: contractType,
            bytecodeHash: templateHash,
            timestamp: block.timestamp
        }));
        deployerHistory[msg.sender].push(idx);

        emit ContractDeployed(deployed, msg.sender, contractType, templateHash);
    }

    /**
     * @notice Get total deployment count.
     */
    function deploymentCount() external view returns (uint256) {
        return deployments.length;
    }

    /**
     * @notice Get all deployment indices for a deployer.
     */
    function getDeployerHistory(address deployer) external view returns (uint256[] memory) {
        return deployerHistory[deployer];
    }

    /**
     * @notice Get deployment details by index.
     */
    function getDeployment(uint256 index) external view returns (
        address contractAddress,
        address deployer,
        string memory contractType,
        bytes32 bytecodeHash,
        uint256 timestamp
    ) {
        require(index < deployments.length, "Index out of bounds");
        Deployment memory d = deployments[index];
        return (d.contractAddress, d.deployer, d.contractType, d.bytecodeHash, d.timestamp);
    }
}
