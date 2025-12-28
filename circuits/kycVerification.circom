pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * KYC Verification Circuit
 *
 * Private inputs:
 *   - kycCredential: Signed KYC data from provider
 *   - userSecret: Random secret for commitment
 *   - countryCode: User's country code
 *   - riskScore: User's risk score (0-100)
 *   - expiresAt: KYC expiration timestamp
 *
 * Public inputs:
 *   - nullifier: Unique identifier to prevent double-use
 *   - commitment: Public commitment to user data
 *   - providerPubKey: KYC provider's public key
 *   - currentTimestamp: Current block timestamp
 *   - blockedCountries[]: Array of blocked country codes
 *
 * Constraints:
 *   1. KYC is not expired
 *   2. Country is not in blocked list
 *   3. Risk score is below threshold (70)
 *   4. Nullifier is computed correctly from inputs
 *   5. Commitment is computed correctly
 */

template KYCVerification(maxBlockedCountries) {
    // Private inputs
    signal input userSecret;
    signal input countryCode;
    signal input riskScore;
    signal input expiresAt;
    signal input kycDataHash;  // Hash of KYC credential from provider

    // Public inputs
    signal input nullifier;
    signal input commitment;
    signal input providerPubKeyHash;
    signal input currentTimestamp;
    signal input blockedCountries[maxBlockedCountries];
    signal input maxRiskScore;

    // Intermediate signals
    signal output isValid;

    // Components
    component nullifierHasher = Poseidon(3);
    component commitmentHasher = Poseidon(2);
    component expiryCheck = GreaterThan(64);
    component riskScoreCheck = LessThan(8);

    // 1. Verify nullifier computation
    // nullifier = Hash(userSecret, kycDataHash, countryCode)
    nullifierHasher.inputs[0] <== userSecret;
    nullifierHasher.inputs[1] <== kycDataHash;
    nullifierHasher.inputs[2] <== countryCode;
    nullifier === nullifierHasher.out;

    // 2. Verify commitment computation
    // commitment = Hash(userSecret, providerPubKeyHash)
    commitmentHasher.inputs[0] <== userSecret;
    commitmentHasher.inputs[1] <== providerPubKeyHash;
    commitment === commitmentHasher.out;

    // 3. Check KYC not expired
    expiryCheck.in[0] <== expiresAt;
    expiryCheck.in[1] <== currentTimestamp;
    expiryCheck.out === 1;

    // 4. Check risk score is acceptable
    riskScoreCheck.in[0] <== riskScore;
    riskScoreCheck.in[1] <== maxRiskScore;
    riskScoreCheck.out === 1;

    // 5. Verify country is not blocked
    component countryChecks[maxBlockedCountries];
    signal countryNotBlocked[maxBlockedCountries];

    for (var i = 0; i < maxBlockedCountries; i++) {
        countryChecks[i] = IsEqual();
        countryChecks[i].in[0] <== countryCode;
        countryChecks[i].in[1] <== blockedCountries[i];

        // If country matches blocked country, countryChecks[i].out = 1
        // We want all to be 0 (not blocked)
        countryNotBlocked[i] <== 1 - countryChecks[i].out;
    }

    // All country checks must pass (all must be 1)
    signal countryCheckProduct[maxBlockedCountries];
    countryCheckProduct[0] <== countryNotBlocked[0];

    for (var i = 1; i < maxBlockedCountries; i++) {
        countryCheckProduct[i] <== countryCheckProduct[i-1] * countryNotBlocked[i];
    }

    // Final check: all constraints must be satisfied
    countryCheckProduct[maxBlockedCountries - 1] === 1;

    isValid <== 1;
}

// Main component with max 10 blocked countries
component main {public [nullifier, commitment, providerPubKeyHash, currentTimestamp, blockedCountries, maxRiskScore]} = KYCVerification(10);
