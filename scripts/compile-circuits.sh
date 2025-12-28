#!/bin/bash

# Circuit Compilation Script for KYC Verification
# This compiles the circom circuit and generates the verification key

set -e

echo "🔧 Compiling ZK Circuits for KYC Verification..."

# Create build directory
mkdir -p build/circuits
mkdir -p build/keys

# Install circom if not installed
if ! command -v circom &> /dev/null; then
    echo "❌ circom not found. Please install circom first:"
    echo "   git clone https://github.com/iden3/circom.git"
    echo "   cd circom && cargo build --release && cargo install --path circom"
    exit 1
fi

echo "✅ circom found"

# Compile the circuit
echo "📦 Compiling kycVerification.circom..."
circom circuits/kycVerification.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -o build/circuits

echo "✅ Circuit compiled successfully"

# Generate witness calculator
echo "📦 Building witness calculator..."
cd build/circuits/kycVerification_js
npm install
cd ../../..

echo "✅ Witness calculator ready"

# Download Powers of Tau (or use existing)
echo "📥 Downloading Powers of Tau ceremony file..."
if [ ! -f build/keys/powersOfTau28_hez_final_14.ptau ]; then
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau \
        -O build/keys/powersOfTau28_hez_final_14.ptau
    echo "✅ Downloaded Powers of Tau"
else
    echo "✅ Powers of Tau already exists"
fi

# Generate zkey (circuit-specific proving key)
echo "🔑 Generating proving key..."
npx snarkjs groth16 setup \
    build/circuits/kycVerification.r1cs \
    build/keys/powersOfTau28_hez_final_14.ptau \
    build/keys/kycVerification_0000.zkey

echo "✅ Initial zkey generated"

# Contribute to the ceremony (for production, do proper ceremony)
echo "🔑 Contributing to key generation ceremony..."
echo "mantle-rwa-zk-ceremony" | npx snarkjs zkey contribute \
    build/keys/kycVerification_0000.zkey \
    build/keys/kycVerification_final.zkey \
    --name="First contribution" \
    -v

echo "✅ Final zkey generated"

# Export verification key
echo "📤 Exporting verification key..."
npx snarkjs zkey export verificationkey \
    build/keys/kycVerification_final.zkey \
    build/keys/verification_key.json

echo "✅ Verification key exported"

# Generate Solidity verifier
echo "📝 Generating Solidity verifier contract..."
npx snarkjs zkey export solidityverifier \
    build/keys/kycVerification_final.zkey \
    build/circuits/Groth16VerifierGenerated.sol

echo "✅ Solidity verifier generated at build/circuits/Groth16VerifierGenerated.sol"

# Show circuit info
echo ""
echo "📊 Circuit Information:"
npx snarkjs r1cs info build/circuits/kycVerification.r1cs

echo ""
echo "✅ ✅ ✅ Circuit compilation complete! ✅ ✅ ✅"
echo ""
echo "Generated files:"
echo "  - build/circuits/kycVerification.r1cs"
echo "  - build/circuits/kycVerification_js/ (witness calculator)"
echo "  - build/keys/kycVerification_final.zkey (proving key)"
echo "  - build/keys/verification_key.json"
echo "  - build/circuits/Groth16VerifierGenerated.sol"
echo ""
echo "Next steps:"
echo "  1. Copy Groth16VerifierGenerated.sol to contracts/ if needed"
echo "  2. Run 'npm run generate:proof' to test proof generation"
echo "  3. Deploy contracts with ZK verification enabled"
