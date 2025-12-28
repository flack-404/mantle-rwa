'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, keccak256, toBytes } from 'viem';
import { CONTRACTS, ABIS, INVOICE_STATUS } from '@/lib/contracts';

export default function BusinessPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'mint' | 'myInvoices'>('mint');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Business Portal</h1>
        <p className="text-gray-400">
          Convert your unpaid invoices into instant cash
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-12 border border-gray-700 text-center">
          <p className="text-xl text-gray-300 mb-4">
            Connect your wallet to access the business portal
          </p>
          <p className="text-gray-500">
            Use the "Connect Wallet" button in the top right
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => setActiveTab('mint')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'mint'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Mint Invoice
            </button>
            <button
              onClick={() => setActiveTab('myInvoices')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'myInvoices'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              My Invoices
            </button>
          </div>

          {/* Content */}
          {activeTab === 'mint' ? <MintInvoiceForm /> : <MyInvoicesList />}
        </>
      )}
    </div>
  );
}

function MintInvoiceForm() {
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    debtorName: '',
    faceValue: '',
    maturityDays: '90',
    discountRate: '5',
  });
  const [step, setStep] = useState<'form' | 'kyc' | 'minting'>('form');

  // Check KYC status
  const { data: isKYCVerified } = useReadContract({
    address: CONTRACTS.kycGate as `0x${string}`,
    abi: ABIS.kycGate,
    functionName: 'isVerified',
    args: address ? [address] : undefined,
  });

  // Grant ISSUER_ROLE
  const { writeContract: grantRole, data: grantHash } = useWriteContract();
  const { isSuccess: isRoleGranted } = useWaitForTransactionReceipt({
    hash: grantHash,
  });

  // KYC verification
  const { writeContract: verifyKYC, data: kycHash } = useWriteContract();
  const { isSuccess: isKYCSuccess } = useWaitForTransactionReceipt({
    hash: kycHash,
  });

  // Mint invoice
  const { writeContract: mintInvoice, data: mintHash, isPending } = useWriteContract();
  const { isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  const handleKYCVerify = async () => {
    if (!address) return;

    setStep('kyc');

    const countryHash = keccak256(toBytes('US'));
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

    verifyKYC({
      address: CONTRACTS.kycGate as `0x${string}`,
      abi: ABIS.kycGate,
      functionName: 'verifyUser',
      args: [address, expiresAt, countryHash, 30, 'BUSINESS-' + Date.now(), 1],
    });
  };

  const handleMintInvoice = async () => {
    if (!address || !formData.debtorName || !formData.faceValue) return;

    setStep('minting');

    const faceValue = parseUnits(formData.faceValue, 6); // USDC has 6 decimals
    const maturityDate = BigInt(Math.floor(Date.now() / 1000) + Number(formData.maturityDays) * 24 * 60 * 60);
    const debtorAddress = '0x' + '1'.repeat(40); // Mock debtor address
    const invoiceHash = keccak256(toBytes(`invoice-${Date.now()}`));
    const discountRate = BigInt(Number(formData.discountRate) * 100); // 5% = 500 basis points

    mintInvoice({
      address: CONTRACTS.invoiceNFT as `0x${string}`,
      abi: ABIS.invoiceNFT,
      functionName: 'mintInvoice',
      args: [faceValue, maturityDate, debtorAddress, invoiceHash, formData.debtorName, discountRate],
    });
  };

  if (isMintSuccess) {
    return (
      <div className="bg-green-900/20 border border-green-500 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-white mb-2">Invoice Minted Successfully!</h2>
        <p className="text-gray-300 mb-4">
          Your invoice has been tokenized and is now pending Oracle verification.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          The Oracle will automatically verify your invoice within 30 seconds.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setStep('form');
              setFormData({ debtorName: '', faceValue: '', maturityDays: '90', discountRate: '5' });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Mint Another Invoice
          </button>
          <a
            href={`https://sepolia.mantlescan.xyz/tx/${mintHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
          >
            View Transaction
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6">Mint New Invoice</h2>

      {/* KYC Status */}
      {!isKYCVerified && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-6">
          <p className="text-yellow-300 mb-3">
            ⚠️ KYC verification required before minting invoices
          </p>
          <button
            onClick={handleKYCVerify}
            disabled={step === 'kyc'}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {step === 'kyc' ? 'Verifying...' : 'Complete KYC Verification'}
          </button>
        </div>
      )}

      {isKYCSuccess && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
          <p className="text-green-300">✅ KYC Verified! You can now mint invoices.</p>
        </div>
      )}

      {/* Form */}
      <div className="space-y-6">
        <div>
          <label className="block text-gray-300 mb-2">Debtor Name</label>
          <input
            type="text"
            value={formData.debtorName}
            onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
            placeholder="e.g., Walmart Inc"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            disabled={!isKYCVerified}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">Invoice Amount (USDC)</label>
          <input
            type="number"
            value={formData.faceValue}
            onChange={(e) => setFormData({ ...formData, faceValue: e.target.value })}
            placeholder="100000"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            disabled={!isKYCVerified}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 mb-2">Maturity (Days)</label>
            <select
              value={formData.maturityDays}
              onChange={(e) => setFormData({ ...formData, maturityDays: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              disabled={!isKYCVerified}
            >
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
              <option value="120">120 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Discount Rate (%)</label>
            <select
              value={formData.discountRate}
              onChange={(e) => setFormData({ ...formData, discountRate: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              disabled={!isKYCVerified}
            >
              <option value="3">3%</option>
              <option value="5">5%</option>
              <option value="7">7%</option>
              <option value="10">10%</option>
            </select>
          </div>
        </div>

        {/* Calculation Preview */}
        {formData.faceValue && (
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
            <p className="text-gray-300 mb-2">You will receive:</p>
            <p className="text-3xl font-bold text-blue-400">
              ${(Number(formData.faceValue) * (1 - Number(formData.discountRate) / 100)).toLocaleString()} USDC
            </p>
            <p className="text-sm text-gray-400 mt-2">
              ({formData.discountRate}% discount = ${(Number(formData.faceValue) * Number(formData.discountRate) / 100).toLocaleString()} fee)
            </p>
          </div>
        )}

        <button
          onClick={handleMintInvoice}
          disabled={!isKYCVerified || isPending || !formData.debtorName || !formData.faceValue}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isPending ? 'Minting Invoice...' : 'Mint Invoice NFT'}
        </button>
      </div>
    </div>
  );
}

function MyInvoicesList() {
  const { address } = useAccount();

  // Get user's invoice count
  const { data: balance } = useReadContract({
    address: CONTRACTS.invoiceNFT as `0x${string}`,
    abi: ABIS.invoiceNFT,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const invoiceCount = balance ? Number(balance) : 0;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6">My Invoices</h2>

      {invoiceCount === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-4">You haven't minted any invoices yet</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-400 hover:text-blue-300"
          >
            Mint your first invoice →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-300">You have {invoiceCount} invoice(s)</p>
          <p className="text-sm text-gray-500">
            Invoice details will be displayed here. Connect to the indexer for full functionality.
          </p>

          {/* Placeholder for invoice cards */}
          <div className="grid gap-4">
            {Array.from({ length: invoiceCount }).map((_, i) => (
              <div key={i} className="bg-gray-900/50 border border-gray-600 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Invoice #{i + 1}</h3>
                    <p className="text-gray-400">Status: View on Explorer</p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm">
                    PENDING
                  </span>
                </div>
                <a
                  href={`https://sepolia.mantlescan.xyz/token/${CONTRACTS.invoiceNFT}?a=${i + 1}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View on Explorer →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
