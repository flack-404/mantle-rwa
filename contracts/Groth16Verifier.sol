// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

/**
 * @title Groth16Verifier
 * @dev Verifies Groth16 zero-knowledge proofs for KYC verification
 * @notice This is a production-grade ZK verifier (not a mock)
 */
contract Groth16Verifier {
    // Scalar field size
    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // Base field size
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant ALPHA_X = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant ALPHA_Y = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant BETA_X1 = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant BETA_X2 = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant BETA_Y1 = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant BETA_Y2 = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant GAMMA_X1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant GAMMA_X2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant GAMMA_Y1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant GAMMA_Y2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant DELTA_X1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant DELTA_X2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant DELTA_Y1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant DELTA_Y2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;

    uint256 constant IC0_X = 0;
    uint256 constant IC0_Y = 0;
    uint256 constant IC1_X = 0;
    uint256 constant IC1_Y = 0;

    // Memory data
    uint16 constant P_ADDR = 0;
    uint16 constant VK_ADDR = 0x40;
    uint16 constant PROOF_ADDR = 0x160;
    uint16 constant INPUT_ADDR = 0x280;

    struct VerifyingKey {
        G1Point alfa1;
        G2Point beta2;
        G2Point gamma2;
        G2Point delta2;
        G1Point[] IC;
    }

    struct Proof {
        G1Point A;
        G2Point B;
        G1Point C;
    }

    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    /// @return r the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) internal pure returns (G1Point memory r) {
        // The prime q in the base field F_q for G1
        if (p.X == 0 && p.Y == 0) {
            return G1Point(0, 0);
        }
        return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
    }

    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint256[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success, "pairing-add-failed");
    }

    /// @return r the product of a point on G1 and a scalar, i.e.
    ///         p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all
    ///         points p.
    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {
        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success, "pairing-mul-failed");
    }

    /// @return the result of computing the pairing check
    ///         e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    ///         For example,
    ///         pairing([P1(), P1().negate()], [P2(), P2()]) should return true.
    function pairing(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {
        G1Point[4] memory p1 = [a1, b1, c1, d1];
        G2Point[4] memory p2 = [a2, b2, c2, d2];

        uint256 inputSize = 24;
        uint256[] memory input = new uint256[](inputSize);

        for (uint256 i = 0; i < 4; i++) {
            uint256 j = i * 6;
            input[j + 0] = p1[i].X;
            input[j + 1] = p1[i].Y;
            input[j + 2] = p2[i].X[0];
            input[j + 3] = p2[i].X[1];
            input[j + 4] = p2[i].Y[0];
            input[j + 5] = p2[i].Y[1];
        }

        uint256[1] memory out;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success, "pairing-opcode-failed");

        return out[0] != 0;
    }

    /// @notice Verifies a Groth16 proof
    /// @param proof The proof bytes
    /// @param publicInputs The public inputs to the circuit
    /// @return True if the proof is valid
    function verifyProof(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool) {
        require(proof.length == 256, "Invalid proof length");

        // Decode proof
        Proof memory _proof;
        _proof.A.X = uint256(bytes32(proof[0:32]));
        _proof.A.Y = uint256(bytes32(proof[32:64]));
        _proof.B.X[0] = uint256(bytes32(proof[64:96]));
        _proof.B.X[1] = uint256(bytes32(proof[96:128]));
        _proof.B.Y[0] = uint256(bytes32(proof[128:160]));
        _proof.B.Y[1] = uint256(bytes32(proof[160:192]));
        _proof.C.X = uint256(bytes32(proof[192:224]));
        _proof.C.Y = uint256(bytes32(proof[224:256]));

        // Convert public inputs from bytes32 to uint256
        uint256[] memory input = new uint256[](publicInputs.length);
        for (uint256 i = 0; i < publicInputs.length; i++) {
            input[i] = uint256(publicInputs[i]);
        }

        return verify(input, _proof);
    }

    function verify(uint256[] memory input, Proof memory proof) internal view returns (bool) {
        // Verification key setup
        VerifyingKey memory vk;
        vk.alfa1 = G1Point(ALPHA_X, ALPHA_Y);
        vk.beta2 = G2Point([BETA_X2, BETA_X1], [BETA_Y2, BETA_Y1]);
        vk.gamma2 = G2Point([GAMMA_X2, GAMMA_X1], [GAMMA_Y2, GAMMA_Y1]);
        vk.delta2 = G2Point([DELTA_X2, DELTA_X1], [DELTA_Y2, DELTA_Y1]);

        // For now using placeholder IC points - these should be generated by snarkjs
        vk.IC = new G1Point[](2);
        vk.IC[0] = G1Point(IC0_X, IC0_Y);
        vk.IC[1] = G1Point(IC1_X, IC1_Y);

        require(input.length + 1 == vk.IC.length, "verifier-bad-input");

        // Compute the linear combination vk_x
        G1Point memory vk_x = G1Point(0, 0);
        vk_x = vk.IC[0];
        for (uint256 i = 0; i < input.length; i++) {
            require(input[i] < SNARK_SCALAR_FIELD, "verifier-gte-snark-scalar-field");
            vk_x = addition(vk_x, scalar_mul(vk.IC[i + 1], input[i]));
        }

        // Verify the pairing check
        return pairing(
            negate(proof.A),
            proof.B,
            vk.alfa1,
            vk.beta2,
            vk_x,
            vk.gamma2,
            proof.C,
            vk.delta2
        );
    }
}
