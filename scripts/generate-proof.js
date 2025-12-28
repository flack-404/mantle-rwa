/**
 * ZK Proof Generation Script
 *
 * This script demonstrates how to generate a zero-knowledge proof
 * for KYC verification using the compiled circuit.
 */

const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const { buildPoseidon } = require('circomlibjs');

async function generateKYCProof() {
    console.log('🔐 Generating ZK Proof for KYC Verification...\n');

    // Initialize Poseidon hash
    const poseidon = await buildPoseidon();

    // Example private inputs (these would come from user's KYC data)
    const userSecret = BigInt('123456789012345678901234567890'); // Random user secret
    const countryCode = BigInt(1); // Country code (1 = US, 2 = UK, etc.)
    const riskScore = BigInt(35); // Risk score (0-100)
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60); // Expires in 1 year
    const kycDataHash = BigInt('987654321098765432109876543210'); // Hash of KYC credential

    // Example public inputs
    const providerPubKeyHash = BigInt('111111111111111111111111111111');
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const blockedCountries = [
        BigInt(99), // Blocked country 1
        BigInt(88), // Blocked country 2
        BigInt(0),  // Empty slots
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0)
    ];
    const maxRiskScore = BigInt(70);

    // Calculate nullifier: Hash(userSecret, kycDataHash, countryCode)
    const nullifier = poseidon.F.toString(
        poseidon([userSecret, kycDataHash, countryCode])
    );

    // Calculate commitment: Hash(userSecret, providerPubKeyHash)
    const commitment = poseidon.F.toString(
        poseidon([userSecret, providerPubKeyHash])
    );

    console.log('📋 Private Inputs:');
    console.log('  userSecret:', userSecret.toString());
    console.log('  countryCode:', countryCode.toString());
    console.log('  riskScore:', riskScore.toString());
    console.log('  expiresAt:', expiresAt.toString());
    console.log('  kycDataHash:', kycDataHash.toString());
    console.log('');

    console.log('📋 Public Inputs:');
    console.log('  nullifier:', nullifier);
    console.log('  commitment:', commitment);
    console.log('  providerPubKeyHash:', providerPubKeyHash.toString());
    console.log('  currentTimestamp:', currentTimestamp.toString());
    console.log('  maxRiskScore:', maxRiskScore.toString());
    console.log('');

    // Circuit inputs
    const input = {
        // Private
        userSecret: userSecret.toString(),
        countryCode: countryCode.toString(),
        riskScore: riskScore.toString(),
        expiresAt: expiresAt.toString(),
        kycDataHash: kycDataHash.toString(),

        // Public
        nullifier: nullifier,
        commitment: commitment,
        providerPubKeyHash: providerPubKeyHash.toString(),
        currentTimestamp: currentTimestamp.toString(),
        blockedCountries: blockedCountries.map(c => c.toString()),
        maxRiskScore: maxRiskScore.toString()
    };

    // Check if circuit is compiled
    const wasmPath = path.join(__dirname, '../build/circuits/kycVerification_js/kycVerification.wasm');
    const zkeyPath = path.join(__dirname, '../build/keys/kycVerification_final.zkey');

    if (!fs.existsSync(wasmPath)) {
        console.error('❌ Circuit not compiled. Run: npm run compile:circuits');
        process.exit(1);
    }

    if (!fs.existsSync(zkeyPath)) {
        console.error('❌ Proving key not found. Run: npm run compile:circuits');
        process.exit(1);
    }

    console.log('⏳ Generating witness...');
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        wasmPath,
        zkeyPath
    );

    console.log('✅ Witness generated\n');

    console.log('⏳ Generating proof...');
    console.log('✅ Proof generated!\n');

    console.log('📦 Proof:');
    console.log(JSON.stringify(proof, null, 2));
    console.log('');

    console.log('📦 Public Signals:');
    console.log(JSON.stringify(publicSignals, null, 2));
    console.log('');

    // Save proof to file
    const proofDir = path.join(__dirname, '../build/proofs');
    if (!fs.existsSync(proofDir)) {
        fs.mkdirSync(proofDir, { recursive: true });
    }

    const proofData = {
        proof,
        publicSignals,
        input: {
            // Only include what's safe to save
            countryCode: countryCode.toString(),
            riskScore: riskScore.toString(),
            nullifier,
            commitment
        },
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(proofDir, 'latest-proof.json'),
        JSON.stringify(proofData, null, 2)
    );

    console.log('💾 Proof saved to build/proofs/latest-proof.json\n');

    // Verify the proof
    console.log('⏳ Verifying proof...');
    const vkeyPath = path.join(__dirname, '../build/keys/verification_key.json');
    const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf-8'));

    const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    if (verified) {
        console.log('✅ ✅ ✅ Proof verified successfully! ✅ ✅ ✅\n');
    } else {
        console.log('❌ Proof verification failed\n');
    }

    // Generate calldata for Solidity
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    console.log('📞 Solidity Calldata:');
    console.log(calldata);
    console.log('');

    return {
        proof,
        publicSignals,
        verified
    };
}

// Run if called directly
if (require.main === module) {
    generateKYCProof()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = { generateKYCProof };
