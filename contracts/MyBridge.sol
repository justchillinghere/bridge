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
    uint256 public initChainId;
    uint256 public destChainId;
    mapping(uint256 => bool) public usedNonce;

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum SwapType {
        Swap,
        Redeem
    }
    event Transfer(
        address from,
        address to,
        uint256 amount,
        uint256 nonce,
        SwapType swapType
    );

    constructor(address _token, uint256 _destChainId) {
        token = MyToken(_token);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(VALIDATOR_ROLE, ADMIN_ROLE);
        initChainId = block.chainid;
        destChainId = _destChainId;
    }

    function grantValidatorRole(
        address newValidator
    ) public onlyRole(ADMIN_ROLE) {
        grantRole(VALIDATOR_ROLE, newValidator);
    }

    function swap(address recepient, uint256 amount) public {
        token.burn(msg.sender, amount);
        nonce++;
        emit Transfer(msg.sender, recepient, amount, nonce, SwapType.Swap);
    }

    function redeem(
        address sender,
        address recepient,
        uint256 amount,
        uint256 _nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        bytes32 message = keccak256(
            abi.encodePacked(
                sender,
                recepient,
                amount,
                _nonce,
                initChainId,
                destChainId
            )
        );

        address signer = message.toEthSignedMessageHash().recover(v, r, s);
        require(
            hasRole(VALIDATOR_ROLE, signer),
            "Bridge: Invalid validator address"
        );
        require(signer == sender, "Invalid signature");
        require(!usedNonce[_nonce], "Nonce already used");
        usedNonce[_nonce] = true;
        token.mint(recepient, amount);
        emit Transfer(sender, recepient, amount, _nonce, SwapType.Redeem);
    }
}
