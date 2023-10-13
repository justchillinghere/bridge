//SPDX-License-Identifier: Unlicense
pragma solidity =0.8.18;

/**
 * @title IMyBridge
 * @author justchillinghere
 * @dev Interface for the my implementation of a bridge contract.
 */

interface IMyBridge {
    /**
     * @notice Swap tokens from sender to recipient
     * @param recipient The address of the recipient
     * @param amount The amount of tokens to swap
     */
    function swap(address recipient, uint256 amount) external;

    /**
     * @notice Redeem tokens from sender to recipient
     * @param sender The address of the sender
     * @param recipient The address of the recipient
     * @param amount The amount of tokens to redeem
     * @param _nonce The nonce for this transaction
     * @param initChainId The chain id of the chain where the transaction was initiated
     * @param destChainId The chain id of the chain where the transaction will be executed
     * @param v ECDSA signature parameter v
     * @param r ECDSA signature parameter r
     * @param s ECDSA signature parameter s
     */
    function redeem(
        address sender,
        address recipient,
        uint256 amount,
        uint256 _nonce,
        uint8 initChainId,
        uint8 destChainId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
