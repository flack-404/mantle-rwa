'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, keccak256, toBytes } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export default function InvestorPage() {
  const { address, isConnected } = useAccount();
  const [selectedVault, setSelectedVault] = useState<'senior' | 'junior'>('senior');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Investor Portal</h1>
        <p className="text-gray-400">
          Earn yield by investing in invoice-backed vaults
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-12 border border-gray-700 text-center">
          <p className="text-xl text-gray-300 mb-4">
            Connect your wallet to access the investor portal
          </p>
          <p className="text-gray-500">
            Use the "Connect Wallet" button in the top right
          </p>
        </div>
      ) : (
        <>
          {/* Vault Selection */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <VaultCard
              type="senior"
              isSelected={selectedVault === 'senior'}
              onSelect={() => setSelectedVault('senior')}
            />
            <VaultCard
              type="junior"
              isSelected={selectedVault === 'junior'}
              onSelect={() => setSelectedVault('junior')}
            />
          </div>

          {/* Vault Interface */}
          <VaultInterface vaultType={selectedVault} />
        </>
      )}
    </div>
  );
}

function VaultCard({
  type,
  isSelected,
  onSelect,
}: {
  type: 'senior' | 'junior';
  isSelected: boolean;
  onSelect: () => void;
}) {
  const vaultAddress = type === 'senior' ? CONTRACTS.seniorVault : CONTRACTS.juniorVault;

  const { data: stats } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: ABIS.trancheVault,
    functionName: 'getVaultStats',
  });

  const tvl = stats ? formatUnits(stats[0], 6) : '0';
  const expectedAPY = stats ? (Number(stats[6]) / 100).toFixed(2) : type === 'senior' ? '8.00' : '20.00';

  return (
    <button
      onClick={onSelect}
      className={`text-left p-6 rounded-lg border-2 transition ${
        isSelected
          ? 'border-blue-500 bg-blue-900/20'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-white capitalize">{type} Tranche</h3>
          <p className="text-gray-400 mt-1">
            {type === 'senior' ? 'Lower risk, stable returns' : 'Higher risk, higher returns'}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${
          type === 'senior' ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'
        }`}>
          {type === 'senior' ? 'Stable' : 'Growth'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-500 text-sm">Target APY</p>
          <p className="text-2xl font-bold text-white">{expectedAPY}%</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Total Value Locked</p>
          <p className="text-2xl font-bold text-white">${tvl}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          {type === 'senior'
            ? 'Senior tranche gets paid first, offering more stability and lower returns.'
            : 'Junior tranche absorbs losses first but offers higher potential returns.'}
        </p>
      </div>
    </button>
  );
}

function VaultInterface({ vaultType }: { vaultType: 'senior' | 'junior' }) {
  const { address } = useAccount();
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');

  const vaultAddress = vaultType === 'senior' ? CONTRACTS.seniorVault : CONTRACTS.juniorVault;

  // Check KYC
  const { data: isKYCVerified } = useReadContract({
    address: CONTRACTS.kycGate as `0x${string}`,
    abi: ABIS.kycGate,
    functionName: 'isVerified',
    args: address ? [address] : undefined,
  });

  // Get USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.mockUSDC as `0x${string}`,
    abi: ABIS.mockUSDC,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Get vault position
  const { data: position } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: ABIS.trancheVault,
    functionName: 'getUserPosition',
    args: address ? [address] : undefined,
  });

  // KYC verification
  const { writeContract: verifyKYC, data: kycHash } = useWriteContract();
  const { isSuccess: isKYCSuccess } = useWaitForTransactionReceipt({ hash: kycHash });

  // Claim USDC from faucet
  const { writeContract: claimFaucet, data: faucetHash } = useWriteContract();
  const { isSuccess: isFaucetSuccess } = useWaitForTransactionReceipt({ hash: faucetHash });

  // Approve USDC
  const { writeContract: approveUSDC, data: approveHash } = useWriteContract();
  const { isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveHash });

  // Deposit
  const { writeContract: deposit, data: depositHash, isPending: isDepositing } = useWriteContract();
  const { isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

  // Redeem
  const { writeContract: redeem, data: redeemHash, isPending: isRedeeming } = useWriteContract();
  const { isSuccess: isRedeemSuccess } = useWaitForTransactionReceipt({ hash: redeemHash });

  const handleKYC = () => {
    if (!address) return;
    const countryHash = keccak256(toBytes('US'));
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

    verifyKYC({
      address: CONTRACTS.kycGate as `0x${string}`,
      abi: ABIS.kycGate,
      functionName: 'verifyUser',
      args: [address, expiresAt, countryHash, 25, 'INVESTOR-' + Date.now(), 1],
    });
  };

  const handleFaucet = () => {
    claimFaucet({
      address: CONTRACTS.mockUSDC as `0x${string}`,
      abi: ABIS.mockUSDC,
      functionName: 'faucet',
    });
  };

  const handleApprove = () => {
    if (!amount) return;
    const amountBN = parseUnits(amount, 6);

    approveUSDC({
      address: CONTRACTS.mockUSDC as `0x${string}`,
      abi: ABIS.mockUSDC,
      functionName: 'approve',
      args: [vaultAddress, amountBN],
    });
  };

  const handleDeposit = () => {
    if (!amount || !address) return;
    const amountBN = parseUnits(amount, 6);

    deposit({
      address: vaultAddress as `0x${string}`,
      abi: ABIS.trancheVault,
      functionName: 'deposit',
      args: [amountBN, address],
    });
  };

  const handleRedeem = () => {
    if (!amount || !address || !position) return;
    const sharesBN = parseUnits(amount, 18); // Shares have 18 decimals

    redeem({
      address: vaultAddress as `0x${string}`,
      abi: ABIS.trancheVault,
      functionName: 'redeem',
      args: [sharesBN, address, address],
    });
  };

  const userShares = position ? formatUnits(position[0], 18) : '0';
  const userValue = position ? formatUnits(position[1], 6) : '0';
  const userPercent = position ? (Number(position[2]) / 100).toFixed(2) : '0';
  const balance = usdcBalance ? formatUnits(usdcBalance, 6) : '0';

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Position Summary */}
      <div className="md:col-span-1">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Position</h3>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Value</p>
              <p className="text-2xl font-bold text-white">${parseFloat(userValue).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Shares</p>
              <p className="text-lg text-white">{parseFloat(userShares).toFixed(6)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">% of Vault</p>
              <p className="text-lg text-white">{userPercent}%</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">USDC Balance</h3>
          <p className="text-2xl font-bold text-white mb-4">${parseFloat(balance).toLocaleString()}</p>
          {parseFloat(balance) < 100 && (
            <button
              onClick={handleFaucet}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Claim 1,000 USDC from Faucet
            </button>
          )}
        </div>
      </div>

      {/* Deposit/Withdraw Form */}
      <div className="md:col-span-2">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          {/* KYC Check */}
          {!isKYCVerified && (
            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-6">
              <p className="text-yellow-300 mb-3">
                ⚠️ KYC verification required to invest
              </p>
              <button
                onClick={handleKYC}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
              >
                Complete KYC Verification
              </button>
            </div>
          )}

          {isKYCSuccess && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
              <p className="text-green-300">✅ KYC Verified! You can now invest.</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setTab('deposit')}
              className={`px-6 py-2 rounded-lg font-semibold ${
                tab === 'deposit' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setTab('withdraw')}
              className={`px-6 py-2 rounded-lg font-semibold ${
                tab === 'withdraw' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              Withdraw
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">
                {tab === 'deposit' ? 'Amount to Deposit (USDC)' : 'Shares to Redeem'}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={tab === 'deposit' ? '1000' : userShares}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                disabled={!isKYCVerified}
              />
              {tab === 'deposit' && (
                <p className="text-sm text-gray-400 mt-1">
                  Available: ${balance} USDC
                </p>
              )}
            </div>

            {isDepositSuccess && (
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <p className="text-green-300">✅ Deposit successful!</p>
              </div>
            )}

            {isRedeemSuccess && (
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <p className="text-green-300">✅ Withdrawal successful!</p>
              </div>
            )}

            {tab === 'deposit' ? (
              <div className="space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={!isKYCVerified || !amount}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                >
                  {isApproved ? '✅ Approved' : '1. Approve USDC'}
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={!isKYCVerified || !amount || !isApproved || isDepositing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                >
                  {isDepositing ? 'Depositing...' : '2. Deposit to Vault'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleRedeem}
                disabled={!isKYCVerified || !amount || isRedeeming}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
              >
                {isRedeeming ? 'Withdrawing...' : 'Withdraw from Vault'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
