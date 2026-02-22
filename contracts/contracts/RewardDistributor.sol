// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RewardDistributor
 * @notice ERC-20 token airdrop tool. Owner funds the contract, then
 *         distributes tokens to batches of recipients.
 */
contract RewardDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public rewardToken;
    uint256 public totalAirdrops;
    uint256 public totalDistributed;

    event Airdrop(
        address indexed sender,
        uint256 recipientCount,
        uint256 totalAmount,
        uint256 timestamp
    );
    event Funded(address indexed funder, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);

    constructor(address rewardToken_, address owner_) Ownable(owner_) {
        rewardToken = IERC20(rewardToken_);
    }

    /// @notice Airdrop equal amounts to all recipients (max 200).
    function airdrop(
        address[] calldata recipients,
        uint256 amountEach
    ) external onlyOwner nonReentrant {
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= 200, "Too many recipients - max 200");
        require(amountEach > 0, "Zero amount");

        uint256 total = amountEach * recipients.length;
        require(
            rewardToken.balanceOf(address(this)) >= total,
            "Insufficient token balance - fund the contract first"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Zero address recipient");
            rewardToken.safeTransfer(recipients[i], amountEach);
        }

        totalAirdrops++;
        totalDistributed += total;

        emit Airdrop(msg.sender, recipients.length, total, block.timestamp);
    }

    /// @notice Airdrop custom amounts to each recipient (max 200).
    function airdropCustom(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= 200, "Too many recipients - max 200");
        require(recipients.length == amounts.length, "Length mismatch");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Zero amount");
            total += amounts[i];
        }

        require(
            rewardToken.balanceOf(address(this)) >= total,
            "Insufficient token balance - fund the contract first"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Zero address recipient");
            rewardToken.safeTransfer(recipients[i], amounts[i]);
        }

        totalAirdrops++;
        totalDistributed += total;

        emit Airdrop(msg.sender, recipients.length, total, block.timestamp);
    }

    /// @notice Deposit reward tokens into the contract.
    function fund(uint256 amount) external {
        require(amount > 0, "Zero amount");
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    /// @notice Owner withdraws unused tokens.
    function withdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero amount");
        require(rewardToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        rewardToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Returns the current reward token balance held by this contract.
    function tokenBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }
}
