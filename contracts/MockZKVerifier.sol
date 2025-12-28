// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockZKVerifier
 * @dev Mock ZK verifier for testing and demonstration
 * @notice In production, replace with actual ZK verifier (Groth16, PLONK, etc.)
 */
contract MockZKVerifier {

    // For demonstration: accept all proofs (IN PRODUCTION USE REAL ZK VERIFICATION)
    bool public acceptAllProofs = true;

    // Admin can toggle verification mode
    address public admin;

    mapping(bytes32 => bool) public validProofs;

    event ProofValidated(bytes32 indexed proofHash, bool isValid);
    event VerificationModeUpdated(bool acceptAll);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    /**
     * @dev Verify a zero-knowledge proof
     * @param proof The proof bytes
     * @param publicInputs Public inputs for the proof
     * @return bool True if proof is valid
     */
    function verifyProof(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external view returns (bool) {
        // Mock verification logic
        if (acceptAllProofs) {
            return true;
        }

        // Check if specific proof hash is marked as valid
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));
        return validProofs[proofHash];
    }

    /**
     * @dev Admin function to mark specific proof as valid
     * @param proof The proof bytes
     * @param publicInputs Public inputs
     * @param isValid Whether proof should be considered valid
     */
    function setProofValidity(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        bool isValid
    ) external onlyAdmin {
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));
        validProofs[proofHash] = isValid;

        emit ProofValidated(proofHash, isValid);
    }

    /**
     * @dev Toggle accept-all mode
     * @param _acceptAll Whether to accept all proofs
     */
    function setAcceptAllProofs(bool _acceptAll) external onlyAdmin {
        acceptAllProofs = _acceptAll;

        emit VerificationModeUpdated(_acceptAll);
    }

    /**
     * @dev Transfer admin role
     * @param _newAdmin New admin address
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}
