// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IZKVerifier
 * @dev Interface for ZK proof verification
 */
interface IZKVerifier {
    function verifyProof(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external view returns (bool);
}

/**
 * @title ZKKYCVerifier
 * @dev Privacy-preserving KYC verification using zero-knowledge proofs
 * @notice Allows users to prove compliance without revealing identity
 */
contract ZKKYCVerifier is Ownable, ReentrancyGuard {

    IZKVerifier public zkVerifier;

    // Prevent double-spending of proofs
    mapping(bytes32 => bool) public usedNullifiers;

    // Provider public keys for verification
    mapping(bytes32 => bool) public trustedProviders;

    struct ZKProof {
        bool isValid;
        uint256 verifiedAt;
        uint256 expiresAt;
        bytes32 commitment;     // Commitment to user's KYC data
        bytes32 providerHash;   // Hash of KYC provider
    }

    mapping(address => ZKProof) public proofs;

    // Statistics
    uint256 public totalZKProofsVerified;
    uint256 public totalActiveProofs;

    // Proof validity duration
    uint256 public proofValidityDuration = 365 days;

    event ZKProofVerified(
        address indexed user,
        bytes32 indexed nullifier,
        bytes32 commitment,
        uint256 verifiedAt,
        uint256 expiresAt
    );

    event ZKProofRevoked(
        address indexed user,
        bytes32 nullifier,
        uint256 timestamp
    );

    event ProviderAdded(bytes32 indexed providerHash, uint256 timestamp);
    event ProviderRemoved(bytes32 indexed providerHash, uint256 timestamp);

    event ZKVerifierUpdated(address oldVerifier, address newVerifier);

    constructor(address _zkVerifier) Ownable(msg.sender) {
        require(_zkVerifier != address(0), "Invalid verifier address");
        zkVerifier = IZKVerifier(_zkVerifier);
    }

    /**
     * @dev Submit a zero-knowledge proof for KYC verification
     * @param _proof The ZK proof bytes
     * @param _nullifier Unique nullifier to prevent reuse
     * @param _commitment Commitment to user's KYC data
     * @param _providerHash Hash of the KYC provider
     * @param _expiresAt Expiration timestamp for this proof
     */
    function submitZKProof(
        bytes calldata _proof,
        bytes32 _nullifier,
        bytes32 _commitment,
        bytes32 _providerHash,
        uint256 _expiresAt
    ) external nonReentrant {
        require(_nullifier != bytes32(0), "Invalid nullifier");
        require(_commitment != bytes32(0), "Invalid commitment");
        require(!usedNullifiers[_nullifier], "Nullifier already used");
        require(trustedProviders[_providerHash], "Provider not trusted");
        require(_expiresAt > block.timestamp, "Proof already expired");
        require(
            _expiresAt <= block.timestamp + proofValidityDuration,
            "Expiry too far in future"
        );

        // Construct public inputs for verification
        bytes32[] memory publicInputs = new bytes32[](4);
        publicInputs[0] = _nullifier;
        publicInputs[1] = _commitment;
        publicInputs[2] = _providerHash;
        publicInputs[3] = bytes32(_expiresAt);

        // Verify the ZK proof
        require(
            zkVerifier.verifyProof(_proof, publicInputs),
            "ZK proof verification failed"
        );

        // Mark nullifier as used
        usedNullifiers[_nullifier] = true;

        // Store proof data
        bool wasActive = proofs[msg.sender].isValid &&
                        proofs[msg.sender].expiresAt > block.timestamp;

        proofs[msg.sender] = ZKProof({
            isValid: true,
            verifiedAt: block.timestamp,
            expiresAt: _expiresAt,
            commitment: _commitment,
            providerHash: _providerHash
        });

        totalZKProofsVerified++;

        if (!wasActive) {
            totalActiveProofs++;
        }

        emit ZKProofVerified(
            msg.sender,
            _nullifier,
            _commitment,
            block.timestamp,
            _expiresAt
        );
    }

    /**
     * @dev Submit ZK proof with default expiry
     * @param _proof The ZK proof bytes
     * @param _nullifier Unique nullifier
     * @param _commitment Commitment to KYC data
     * @param _providerHash Hash of KYC provider
     */
    function submitZKProofWithDefaultExpiry(
        bytes calldata _proof,
        bytes32 _nullifier,
        bytes32 _commitment,
        bytes32 _providerHash
    ) external {
        uint256 expiresAt = block.timestamp + proofValidityDuration;
        this.submitZKProof(_proof, _nullifier, _commitment, _providerHash, expiresAt);
    }

    /**
     * @dev Check if user has valid ZK proof
     * @param _user Address to check
     * @return bool True if user has valid, non-expired proof
     */
    function isZKVerified(address _user) external view returns (bool) {
        ZKProof memory proof = proofs[_user];
        return proof.isValid && proof.expiresAt > block.timestamp;
    }

    /**
     * @dev Get user's ZK proof data
     * @param _user Address to query
     * @return ZKProof struct
     */
    function getZKProof(address _user) external view returns (ZKProof memory) {
        return proofs[_user];
    }

    /**
     * @dev Revoke a user's ZK proof (admin only, for emergencies)
     * @param _user Address to revoke
     * @param _nullifier Nullifier used in original proof
     */
    function revokeZKProof(address _user, bytes32 _nullifier) external onlyOwner {
        require(proofs[_user].isValid, "User has no valid proof");

        proofs[_user].isValid = false;

        if (proofs[_user].expiresAt > block.timestamp) {
            totalActiveProofs--;
        }

        emit ZKProofRevoked(_user, _nullifier, block.timestamp);
    }

    /**
     * @dev Add trusted KYC provider
     * @param _providerHash Hash of provider's public key or identifier
     */
    function addTrustedProvider(bytes32 _providerHash) external onlyOwner {
        require(_providerHash != bytes32(0), "Invalid provider hash");
        require(!trustedProviders[_providerHash], "Provider already trusted");

        trustedProviders[_providerHash] = true;

        emit ProviderAdded(_providerHash, block.timestamp);
    }

    /**
     * @dev Remove trusted KYC provider
     * @param _providerHash Hash of provider to remove
     */
    function removeTrustedProvider(bytes32 _providerHash) external onlyOwner {
        require(_providerHash != bytes32(0), "Invalid provider hash");
        require(trustedProviders[_providerHash], "Provider not trusted");

        trustedProviders[_providerHash] = false;

        emit ProviderRemoved(_providerHash, block.timestamp);
    }

    /**
     * @dev Check if provider is trusted
     * @param _providerHash Provider hash to check
     * @return bool True if trusted
     */
    function isProviderTrusted(bytes32 _providerHash) external view returns (bool) {
        return trustedProviders[_providerHash];
    }

    /**
     * @dev Update ZK verifier contract
     * @param _newVerifier New verifier contract address
     */
    function updateZKVerifier(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Invalid verifier address");

        address oldVerifier = address(zkVerifier);
        zkVerifier = IZKVerifier(_newVerifier);

        emit ZKVerifierUpdated(oldVerifier, _newVerifier);
    }

    /**
     * @dev Update proof validity duration
     * @param _newDuration New duration in seconds
     */
    function updateProofValidityDuration(uint256 _newDuration) external onlyOwner {
        require(_newDuration > 0, "Duration must be positive");
        require(_newDuration <= 730 days, "Duration too long (max 2 years)");

        proofValidityDuration = _newDuration;
    }

    /**
     * @dev Batch add trusted providers
     * @param _providerHashes Array of provider hashes
     */
    function batchAddProviders(bytes32[] memory _providerHashes) external onlyOwner {
        require(_providerHashes.length > 0, "Empty array");
        require(_providerHashes.length <= 50, "Batch too large");

        for (uint256 i = 0; i < _providerHashes.length; i++) {
            if (_providerHashes[i] != bytes32(0) && !trustedProviders[_providerHashes[i]]) {
                trustedProviders[_providerHashes[i]] = true;
                emit ProviderAdded(_providerHashes[i], block.timestamp);
            }
        }
    }

    /**
     * @dev Get verification statistics
     * @return totalVerified Total number of proofs verified
     * @return currentlyActive Number of currently active proofs
     * @return validityDuration Proof validity duration in seconds
     */
    function getStatistics() external view returns (
        uint256 totalVerified,
        uint256 currentlyActive,
        uint256 validityDuration
    ) {
        return (
            totalZKProofsVerified,
            totalActiveProofs,
            proofValidityDuration
        );
    }

    /**
     * @dev Check if nullifier has been used
     * @param _nullifier Nullifier to check
     * @return bool True if already used
     */
    function isNullifierUsed(bytes32 _nullifier) external view returns (bool) {
        return usedNullifiers[_nullifier];
    }

    /**
     * @dev Get time until proof expires
     * @param _user Address to check
     * @return Seconds until expiry (0 if expired or no proof)
     */
    function getTimeUntilExpiry(address _user) external view returns (uint256) {
        ZKProof memory proof = proofs[_user];

        if (!proof.isValid || proof.expiresAt <= block.timestamp) {
            return 0;
        }

        return proof.expiresAt - block.timestamp;
    }
}
