// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing
 * @notice 6 decimals like real USDC
 */
contract MockUSDC is ERC20, Ownable {

    uint8 private _decimals = 6;

    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        // Mint initial supply for testing (1 million USDC)
        _mint(msg.sender, 1_000_000 * 10**_decimals);
    }

    /**
     * @dev Override decimals to match USDC (6 decimals)
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens (for testing only)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function for testing (anyone can claim 1000 USDC)
     */
    function faucet() external {
        _mint(msg.sender, 1000 * 10**_decimals);
    }

    /**
     * @dev Batch mint to multiple addresses
     */
    function batchMint(address[] memory recipients, uint256[] memory amounts)
        external
        onlyOwner
    {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length <= 100, "Batch too large");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
}
