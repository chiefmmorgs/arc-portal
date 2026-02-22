// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ValidatorRegistry
 * @notice On-chain registry of validators for the ARC network.
 *         Tracks registration status that the backend indexer references.
 */
contract ValidatorRegistry is Ownable {
    struct Validator {
        address addr;
        string moniker;
        bool active;
        uint256 registeredAt;
    }

    mapping(address => Validator) public validators;
    address[] public validatorList;

    event ValidatorRegistered(address indexed validator, string moniker);
    event ValidatorDeactivated(address indexed validator);
    event ValidatorReactivated(address indexed validator);

    constructor(address owner_) Ownable(owner_) {}

    /**
     * @notice Register a new validator. Owner-only to prevent spam.
     */
    function registerValidator(address addr, string calldata moniker) external onlyOwner {
        require(validators[addr].registeredAt == 0, "Already registered");
        validators[addr] = Validator({
            addr: addr,
            moniker: moniker,
            active: true,
            registeredAt: block.timestamp
        });
        validatorList.push(addr);
        emit ValidatorRegistered(addr, moniker);
    }

    /**
     * @notice Deactivate a validator (e.g. for downtime or misbehaviour).
     */
    function deactivateValidator(address addr) external onlyOwner {
        require(validators[addr].registeredAt != 0, "Not registered");
        require(validators[addr].active, "Already inactive");
        validators[addr].active = false;
        emit ValidatorDeactivated(addr);
    }

    /**
     * @notice Reactivate a previously deactivated validator.
     */
    function reactivateValidator(address addr) external onlyOwner {
        require(validators[addr].registeredAt != 0, "Not registered");
        require(!validators[addr].active, "Already active");
        validators[addr].active = true;
        emit ValidatorReactivated(addr);
    }

    /**
     * @notice Returns total count of registered validators.
     */
    function validatorCount() external view returns (uint256) {
        return validatorList.length;
    }

    /**
     * @notice Returns a paginated slice of validator addresses.
     */
    function getValidators(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = validatorList.length;
        if (offset >= total) {
            return new address[](0);
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = validatorList[i];
        }
        return result;
    }

    /**
     * @notice Check if an address is an active validator.
     */
    function isActiveValidator(address addr) external view returns (bool) {
        return validators[addr].active;
    }
}
