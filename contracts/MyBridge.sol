//SPDX-License-Identifier: Unlicense
pragma solidity =0.8.18;

import "./MyToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IMyBridge.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title MyBridge
 * @author justchillinghere
 * @notice A contract for a custom bridge contract.
 */
contract MyBridge is IMyBridge, AccessControl {
    using ECDSA for bytes32;

    address public admin;
    MyToken public token;
    uint256 public nonce;
    mapping(uint256 => bool) public usedNonce;

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum TransferType {
        Swap,
        Redeem
    }
    event Transfer(
        address from,
        address to,
        uint256 amount,
        uint256 nonce,
        TransferType swapType
    );

    constructor(address _token) {
        token = MyToken(_token);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(VALIDATOR_ROLE, ADMIN_ROLE);
    }

    function swap(address recepient, uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        token.burn(msg.sender, amount);
        nonce++;
        emit Transfer(msg.sender, recepient, amount, nonce, TransferType.Swap);
    }

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
    ) public {
        bytes32 message = keccak256(
            abi.encodePacked(
                sender,
                recipient,
                amount,
                _nonce,
                initChainId,
                destChainId
            )
        );

        address signer = message.toEthSignedMessageHash().recover(v, r, s);
        require(
            hasRole(VALIDATOR_ROLE, signer),
            "Bridge: Invalid validator address or signature"
        );
        require(!usedNonce[_nonce], "Bridge: Nonce already used");
        usedNonce[_nonce] = true;
        token.mint(recipient, amount);
        emit Transfer(sender, recipient, amount, _nonce, TransferType.Redeem);
    }
}
