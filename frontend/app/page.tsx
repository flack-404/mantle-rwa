'use client';

import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { CONTRACTS, ABIS } from '@/lib/contracts';
import { formatUnits } from 'viem';

export default function Home() {
  // Read Senior Vault TVL
  const { data: seniorTVL } = useReadContract({
    address: CONTRACTS.seniorVault as `0x${string}`,
    abi: ABIS.trancheVault,
    functionName: 'totalAssets',
  });

  // Read Junior Vault TVL
  const { data: juniorTVL } = useReadContract({
    address: CONTRACTS.juniorVault as `0x${string}`,
    abi: ABIS.trancheVault,
    functionName: 'totalAssets',
  });

  // Read Total Invoices
  const { data: totalInvoices } = useReadContract({
    address: CONTRACTS.invoiceNFT as `0x${string}`,
    abi: ABIS.invoiceNFT,
    functionName: 'getStatistics',
  });

  // Calculate total TVL
  const totalTVL = Number(seniorTVL || 0n) + Number(juniorTVL || 0n);
  const totalTVLFormatted = (totalTVL / 1e6).toFixed(2);

  const invoiceCount = totalInvoices ? Number(totalInvoices[4]) : 0; // totalSupply is at index 4

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Tokenize Invoices,
          <br />
          <span className="text-blue-400">Unlock Liquidity</span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          The first decentralized invoice factoring protocol on Mantle.
          Businesses get instant cash, investors earn 8-20% APY backed by real receivables.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/business"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            For Businesses
          </Link>
          <Link
            href="/investor"
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            For Investors
          </Link>
        </div>
      </div>

      {/* Stats Section - REAL DATA FROM CONTRACTS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
        <StatCard title="Total Value Locked" value={`$${totalTVLFormatted}`} subtitle="In vaults" />
        <StatCard title="Invoices Minted" value={invoiceCount.toString()} subtitle="On platform" />
        <StatCard title="Senior APY" value="8%" subtitle="Target return" />
        <StatCard title="Junior APY" value="20%" subtitle="Target return" />
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          title="Instant Liquidity"
          description="Convert unpaid invoices to cash in minutes, not months."
          icon="💵"
        />
        <FeatureCard
          title="Real Yield"
          description="Earn 8-20% APY backed by actual business receivables."
          icon="📈"
        />
        <FeatureCard
          title="Compliant & Secure"
          description="KYC verification with optional ZK-KYC for privacy."
          icon="🔒"
        />
      </div>

      {/* How It Works */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-semibold text-blue-400 mb-4">For Businesses</h3>
            <ol className="space-y-4 text-gray-300">
              <li className="flex items-start">
                <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">1</span>
                <div>
                  <strong>Complete KYC</strong> - Quick verification process
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">2</span>
                <div>
                  <strong>Mint Invoice NFT</strong> - Upload unpaid invoice ($100k, Net 90)
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">3</span>
                <div>
                  <strong>Get Cash Now</strong> - Receive $95k instantly (5% discount)
                </div>
              </li>
            </ol>
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-green-400 mb-4">For Investors</h3>
            <ol className="space-y-4 text-gray-300">
              <li className="flex items-start">
                <span className="bg-green-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">1</span>
                <div>
                  <strong>Complete KYC</strong> - One-time verification
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-green-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">2</span>
                <div>
                  <strong>Choose Tranche</strong> - Senior (8% APY) or Junior (20% APY)
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-green-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">3</span>
                <div>
                  <strong>Earn Yield</strong> - Automatic distribution when invoices are paid
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
