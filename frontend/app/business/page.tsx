'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, keccak256, toBytes } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';
import { uploadToIPFS, isIPFSDemoMode } from '@/lib/ipfs';

export default function BusinessPage() {
  const { address, isConnected } = useAccount();
  const [isKYCVerified, setIsKYCVerified] = useState(false);
  const [formData, setFormData] = useState({
    faceValue: '',
    maturityDays: '',
    debtorAddress: '',
    debtorName: '',
    discountRate: '',
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ipfsHash, setIpfsHash] = useState('');
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [myInvoices, setMyInvoices] = useState<any[]>([]);

  // Check KYC status
  const { data: kycStatus } = useReadContract({
    address: CONTRACTS.kycGate as `0x${string}`,
    abi: ABIS.kycGate,
    functionName: 'isVerified',
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    setIsKYCVerified(!!kycStatus);
  }, [kycStatus]);

  // KYC Verification
  const { writeContract: verifyKYC, data: kycHash, isPending: isKYCPending } = useWriteContract();
  const { isSuccess: isKYCSuccess } = useWaitForTransactionReceipt({ hash: kycHash });

  // Invoice Minting
  const { writeContract: mintInvoice, data: mintHash, isPending: isMintPending } = useWriteContract();
  const { isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  // Get user's invoices
  const { data: balance } = useReadContract({
    address: CONTRACTS.invoiceNFT as `0x${string}`,
    abi: ABIS.invoiceNFT,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    if (isKYCSuccess) {
      setIsKYCVerified(true);
    }
  }, [isKYCSuccess]);

  useEffect(() => {
    if (isMintSuccess) {
      alert('✅ Invoice minted successfully!');
      // Refresh invoices list
      fetchMyInvoices();
      // Reset form
      setFormData({ faceValue: '', maturityDays: '', debtorAddress: '', debtorName: '', discountRate: '' });
      setPdfFile(null);
      setIpfsHash('');
    }
  }, [isMintSuccess]);

  // Fetch user's invoices
  const fetchMyInvoices = async () => {
    if (!address || !balance) return;

    const invoices = [];
    for (let i = 0; i < Number(balance); i++) {
      try {
        // This would need tokenOfOwnerByIndex function - simplified for now
        invoices.push({ id: i + 1, status: 'Loading...' });
      } catch (error) {
        console.error('Error fetching invoice:', error);
      }
    }
    setMyInvoices(invoices);
  };

  useEffect(() => {
    fetchMyInvoices();
  }, [balance, address]);

  const handleKYCVerification = () => {
    if (!address) return;

    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60); // 1 year
    const countryHash = keccak256(toBytes('US')); // Example country
    const riskScore = 30;
    const kycId = `KYC-${address.slice(2, 10)}`;
    const tier = 1;

    verifyKYC({
      address: CONTRACTS.kycGate as `0x${string}`,
      abi: ABIS.kycGate,
      functionName: 'verifyUser',
      args: [address, expiresAt, countryHash, riskScore, kycId, tier],
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setPdfFile(file);
    setUploadingPDF(true);

    try {
      const result = await uploadToIPFS(file);
      setIpfsHash(result.hash);
      console.log('✅ Uploaded to IPFS:', result);
    } catch (error) {
      console.error('IPFS upload failed:', error);
      alert('Failed to upload PDF to IPFS');
    } finally {
      setUploadingPDF(false);
    }
  };

  const calculatePreview = () => {
    if (!formData.faceValue || !formData.discountRate) return null;

    const faceValue = parseFloat(formData.faceValue);
    const discountRate = parseFloat(formData.discountRate);
    const discountAmount = (faceValue * discountRate) / 100;
    const youReceive = faceValue - discountAmount;
    const maturityDate = new Date(Date.now() + Number(formData.maturityDays || 0) * 24 * 60 * 60 * 1000);

    return {
      faceValue,
      discount: discountRate,
      discountAmount,
      youReceive,
      maturityDate: maturityDate.toLocaleDateString(),
    };
  };

  const handleMintInvoice = () => {
    if (!address || !isKYCVerified) {
      alert('Please complete KYC verification first');
      return;
    }

    if (!formData.faceValue || !formData.maturityDays || !formData.debtorAddress || !formData.debtorName || !formData.discountRate) {
      alert('Please fill all fields');
      return;
    }

    const faceValue = parseUnits(formData.faceValue, 6); // USDC has 6 decimals
    const maturityDate = BigInt(Math.floor(Date.now() / 1000) + Number(formData.maturityDays) * 24 * 60 * 60);
    const invoiceHash = keccak256(toBytes(`${address}-${Date.now()}-${formData.debtorName}`));
    const discountRate = BigInt(formData.discountRate);

    mintInvoice({
      address: CONTRACTS.invoiceNFT as `0x${string}`,
      abi: ABIS.invoiceNFT,
      functionName: 'mintInvoice',
      args: [faceValue, maturityDate, formData.debtorAddress as `0x${string}`, invoiceHash, formData.debtorName, discountRate],
    });
  };

  const preview = calculatePreview();

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Business Interface</h1>
        <p className="text-gray-400">Please connect your wallet to continue</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Business Interface</h1>

      {/* KYC Status */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">KYC Verification</h2>

        {isKYCVerified ? (
          <div className="flex items-center gap-3">
            <span className="text-4xl">✅</span>
            <div>
              <p className="text-green-400 font-semibold">KYC Verified</p>
              <p className="text-gray-400 text-sm">You can mint invoices</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-yellow-400 mb-4">⚠️ KYC verification required to mint invoices</p>
            <button
              onClick={handleKYCVerification}
              disabled={isKYCPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              {isKYCPending ? 'Verifying...' : 'Complete KYC Verification'}
            </button>
          </div>
        )}
      </div>

      {/* Invoice Minting Form */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Mint Invoice NFT</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Face Value (USDC)</label>
            <input
              type="number"
              value={formData.faceValue}
              onChange={(e) => setFormData({ ...formData, faceValue: e.target.value })}
              placeholder="100000"
              className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Maturity (Days)</label>
            <input
              type="number"
              value={formData.maturityDays}
              onChange={(e) => setFormData({ ...formData, maturityDays: e.target.value })}
              placeholder="90"
              className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Debtor Address</label>
            <input
              type="text"
              value={formData.debtorAddress}
              onChange={(e) => setFormData({ ...formData, debtorAddress: e.target.value })}
              placeholder="0x..."
              className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 outline-none font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Debtor Name</label>
            <input
              type="text"
              value={formData.debtorName}
              onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
              placeholder="Acme Corporation"
              className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Discount Rate (%)</label>
            <input
              type="number"
              value={formData.discountRate}
              onChange={(e) => setFormData({ ...formData, discountRate: e.target.value })}
              placeholder="5"
              step="0.1"
              className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-gray-300 mb-2">
              Invoice PDF {isIPFSDemoMode() && <span className="text-yellow-400">(Demo Mode)</span>}
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {uploadingPDF && <p className="text-blue-400 text-sm mt-2">⏳ Uploading to IPFS...</p>}
            {ipfsHash && (
              <p className="text-green-400 text-sm mt-2">
                ✅ Uploaded to IPFS:{' '}
                <a href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                  {ipfsHash.substring(0, 20)}...
                </a>
              </p>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">Preview</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Face Value:</span>
                  <span className="text-white ml-2">${preview.faceValue.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Discount:</span>
                  <span className="text-white ml-2">{preview.discount}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Discount Amount:</span>
                  <span className="text-white ml-2">-${preview.discountAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">You Receive:</span>
                  <span className="text-green-400 ml-2 font-semibold">${preview.youReceive.toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Maturity Date:</span>
                  <span className="text-white ml-2">{preview.maturityDate}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleMintInvoice}
            disabled={!isKYCVerified || isMintPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {isMintPending ? 'Minting...' : 'Mint Invoice NFT'}
          </button>
        </div>
      </div>

      {/* My Invoices */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-semibold text-white mb-4">My Invoices</h2>

        {balance && Number(balance) > 0 ? (
          <div className="text-gray-300">
            <p>You have {Number(balance)} invoice(s)</p>
            <p className="text-sm text-gray-400 mt-2">Check Dashboard for full invoice list</p>
          </div>
        ) : (
          <p className="text-gray-400">No invoices minted yet</p>
        )}
      </div>
    </div>
  );
}
