// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC20Token
 * @notice Configurable ERC20 token template for ARC Portal deployment engine.
 *         Supports initial mint, optional burn, and owner-only minting.
 */
contract ERC20Token is ERC20, ERC20Burnable, Ownable {
    uint8 private immutable _decimals;

    /**
     * @param name_          Token name
     * @param symbol_        Token symbol
     * @param decimals_      Token decimals (typically 18)
     * @param initialSupply  Initial supply minted to deployer (in whole tokens, scaled by decimals)
     * @param owner_         Address that receives initial supply and ownership
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        _decimals = decimals_;
        _mint(owner_, initialSupply * (10 ** decimals_));
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Owner-only mint for additional supply.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
