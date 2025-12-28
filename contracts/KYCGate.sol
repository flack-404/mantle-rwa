// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KYCGate
 * @dev Compliance layer for KYC verification and access control
 * @notice Manages user verification, country restrictions, and risk scoring
 */
contract KYCGate is AccessControl, ReentrancyGuard {

    bytes32 public constant KYC_PROVIDER_ROLE = keccak256("KYC_PROVIDER");

    struct KYCData {
        bool isVerified;
        uint256 verifiedAt;
        uint256 expiresAt;
        bytes32 countryHash;    // Hash of country code for privacy
        uint8 riskScore;        // 0-100 risk score (lower is better)
        string kycId;           // External KYC provider ID
        uint8 tier;             // KYC tier level (1-3, higher = more verified)
    }

    // User KYC data
    mapping(address => KYCData) public kycData;

    // Country and risk management
    mapping(bytes32 => bool) public blockedCountries;
    mapping(bytes32 => bool) public highRiskCountries;

    // Global settings
    uint8 public maxAcceptableRiskScore = 70;
    uint256 public defaultExpiryDuration = 365 days;
    bool public kycRequired = true;

    // Statistics
    uint256 public totalVerifiedUsers;
    uint256 public totalRevokedUsers;

    event KYCVerified(
        address indexed user,
        uint256 verifiedAt,
        uint256 expiresAt,
        uint8 tier,
        uint8 riskScore
    );

    event KYCRevoked(
        address indexed user,
        uint256 timestamp,
        string reason
    );

    event KYCUpdated(
        address indexed user,
        uint256 newExpiryDate,
        uint8 newRiskScore
    );

    event CountryBlocked(bytes32 indexed countryHash, uint256 timestamp);
    event CountryUnblocked(bytes32 indexed countryHash, uint256 timestamp);

    event RiskScoreThresholdUpdated(uint8 oldThreshold, uint8 newThreshold);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KYC_PROVIDER_ROLE, msg.sender);
    }

    /**
     * @dev Verify a user with KYC data
     * @param _user Address of the user to verify
     * @param _expiresAt Expiration timestamp for KYC
     * @param _countryHash Hash of the country code
     * @param _riskScore Risk score (0-100)
     * @param _kycId External KYC provider identifier
     * @param _tier KYC tier level (1-3)
     */
    function verifyUser(
        address _user,
        uint256 _expiresAt,
        bytes32 _countryHash,
        uint8 _riskScore,
        string memory _kycId,
        uint8 _tier
    ) external onlyRole(KYC_PROVIDER_ROLE) nonReentrant {
        require(_user != address(0), "Invalid user address");
        require(!blockedCountries[_countryHash], "Country is sanctioned");
        require(_expiresAt > block.timestamp, "Expiry must be in future");
        require(_riskScore <= 100, "Risk score must be 0-100");
        require(_riskScore <= maxAcceptableRiskScore, "Risk score too high");
        require(_tier >= 1 && _tier <= 3, "Tier must be 1-3");
        require(bytes(_kycId).length > 0, "KYC ID required");

        bool wasVerified = kycData[_user].isVerified;

        kycData[_user] = KYCData({
            isVerified: true,
            verifiedAt: block.timestamp,
            expiresAt: _expiresAt,
            countryHash: _countryHash,
            riskScore: _riskScore,
            kycId: _kycId,
            tier: _tier
        });

        if (!wasVerified) {
            totalVerifiedUsers++;
        }

        emit KYCVerified(_user, block.timestamp, _expiresAt, _tier, _riskScore);
    }

    /**
     * @dev Quick verify user with default expiry
     * @param _user Address of the user to verify
     * @param _countryHash Hash of the country code
     * @param _riskScore Risk score (0-100)
     * @param _kycId External KYC provider identifier
     */
    function quickVerifyUser(
        address _user,
        bytes32 _countryHash,
        uint8 _riskScore,
        string memory _kycId
    ) external onlyRole(KYC_PROVIDER_ROLE) {
        uint256 expiresAt = block.timestamp + defaultExpiryDuration;
        this.verifyUser(_user, expiresAt, _countryHash, _riskScore, _kycId, 1);
    }

    /**
     * @dev Revoke user KYC status
     * @param _user Address of the user
     * @param _reason Reason for revocation
     */
    function revokeKYC(address _user, string memory _reason)
        external
        onlyRole(KYC_PROVIDER_ROLE)
        nonReentrant
    {
        require(_user != address(0), "Invalid user address");
        require(kycData[_user].isVerified, "User not verified");

        kycData[_user].isVerified = false;
        totalRevokedUsers++;

        emit KYCRevoked(_user, block.timestamp, _reason);
    }

    /**
     * @dev Update user KYC expiry and risk score
     * @param _user Address of the user
     * @param _newExpiresAt New expiration timestamp
     * @param _newRiskScore New risk score
     */
    function updateKYC(
        address _user,
        uint256 _newExpiresAt,
        uint8 _newRiskScore
    ) external onlyRole(KYC_PROVIDER_ROLE) {
        require(_user != address(0), "Invalid user address");
        require(kycData[_user].isVerified, "User not verified");
        require(_newExpiresAt > block.timestamp, "Expiry must be in future");
        require(_newRiskScore <= 100, "Risk score must be 0-100");
        require(_newRiskScore <= maxAcceptableRiskScore, "Risk score too high");

        kycData[_user].expiresAt = _newExpiresAt;
        kycData[_user].riskScore = _newRiskScore;

        emit KYCUpdated(_user, _newExpiresAt, _newRiskScore);
    }

    /**
     * @dev Check if user is currently verified
     * @param _user Address to check
     * @return bool True if user is verified and not expired
     */
    function isVerified(address _user) external view returns (bool) {
        if (!kycRequired) return true;

        KYCData memory data = kycData[_user];
        return data.isVerified &&
               data.expiresAt > block.timestamp &&
               data.riskScore <= maxAcceptableRiskScore;
    }

    /**
     * @dev Check if user meets minimum tier requirement
     * @param _user Address to check
     * @param _minTier Minimum required tier
     * @return bool True if user meets tier requirement
     */
    function meetsT ierRequirement(address _user, uint8 _minTier) external view returns (bool) {
        if (!kycRequired) return true;

        KYCData memory data = kycData[_user];
        return data.isVerified &&
               data.expiresAt > block.timestamp &&
               data.tier >= _minTier;
    }

    /**
     * @dev Get user KYC data
     * @param _user Address to query
     * @return KYCData struct
     */
    function getKYCData(address _user) external view returns (KYCData memory) {
        return kycData[_user];
    }

    /**
     * @dev Block a country from participating
     * @param _countryHash Hash of the country code
     */
    function blockCountry(bytes32 _countryHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_countryHash != bytes32(0), "Invalid country hash");
        require(!blockedCountries[_countryHash], "Country already blocked");

        blockedCountries[_countryHash] = true;

        emit CountryBlocked(_countryHash, block.timestamp);
    }

    /**
     * @dev Unblock a country
     * @param _countryHash Hash of the country code
     */
    function unblockCountry(bytes32 _countryHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_countryHash != bytes32(0), "Invalid country hash");
        require(blockedCountries[_countryHash], "Country not blocked");

        blockedCountries[_countryHash] = false;

        emit CountryUnblocked(_countryHash, block.timestamp);
    }

    /**
     * @dev Mark a country as high risk
     * @param _countryHash Hash of the country code
     */
    function markCountryHighRisk(bytes32 _countryHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_countryHash != bytes32(0), "Invalid country hash");
        highRiskCountries[_countryHash] = true;
    }

    /**
     * @dev Update maximum acceptable risk score
     * @param _newThreshold New risk score threshold (0-100)
     */
    function updateRiskScoreThreshold(uint8 _newThreshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_newThreshold <= 100, "Threshold must be 0-100");
        uint8 oldThreshold = maxAcceptableRiskScore;
        maxAcceptableRiskScore = _newThreshold;

        emit RiskScoreThresholdUpdated(oldThreshold, _newThreshold);
    }

    /**
     * @dev Update default expiry duration
     * @param _newDuration New duration in seconds
     */
    function updateDefaultExpiryDuration(uint256 _newDuration)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_newDuration > 0, "Duration must be positive");
        require(_newDuration <= 730 days, "Duration too long (max 2 years)");
        defaultExpiryDuration = _newDuration;
    }

    /**
     * @dev Toggle KYC requirement globally
     * @param _required Whether KYC is required
     */
    function setKYCRequired(bool _required) external onlyRole(DEFAULT_ADMIN_ROLE) {
        kycRequired = _required;
    }

    /**
     * @dev Get verification statistics
     * @return totalVerified Total verified users
     * @return totalRevoked Total revoked users
     * @return currentThreshold Current risk score threshold
     */
    function getStatistics() external view returns (
        uint256 totalVerified,
        uint256 totalRevoked,
        uint8 currentThreshold
    ) {
        return (totalVerifiedUsers, totalRevokedUsers, maxAcceptableRiskScore);
    }

    /**
     * @dev Check if country is blocked
     * @param _countryHash Hash of the country code
     * @return bool True if blocked
     */
    function isCountryBlocked(bytes32 _countryHash) external view returns (bool) {
        return blockedCountries[_countryHash];
    }

    /**
     * @dev Batch verify multiple users
     * @param _users Array of user addresses
     * @param _expiryDates Array of expiry timestamps
     * @param _countryHashes Array of country hashes
     * @param _riskScores Array of risk scores
     * @param _kycIds Array of KYC IDs
     * @param _tiers Array of tier levels
     */
    function batchVerifyUsers(
        address[] memory _users,
        uint256[] memory _expiryDates,
        bytes32[] memory _countryHashes,
        uint8[] memory _riskScores,
        string[] memory _kycIds,
        uint8[] memory _tiers
    ) external onlyRole(KYC_PROVIDER_ROLE) {
        require(_users.length == _expiryDates.length, "Array length mismatch");
        require(_users.length == _countryHashes.length, "Array length mismatch");
        require(_users.length == _riskScores.length, "Array length mismatch");
        require(_users.length == _kycIds.length, "Array length mismatch");
        require(_users.length == _tiers.length, "Array length mismatch");
        require(_users.length <= 50, "Batch size too large");

        for (uint256 i = 0; i < _users.length; i++) {
            this.verifyUser(
                _users[i],
                _expiryDates[i],
                _countryHashes[i],
                _riskScores[i],
                _kycIds[i],
                _tiers[i]
            );
        }
    }
}
