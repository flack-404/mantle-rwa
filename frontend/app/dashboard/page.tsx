'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type InvoiceStatus = 'PENDING' | 'VERIFIED' | 'FUNDED' | 'PAID' | 'DEFAULTED';

interface Invoice {
  tokenId: number;
  issuer: string;
  faceValue: string;
  discountedValue: string;
  maturityDate: number;
  status: InvoiceStatus;
  debtorName: string;
  fundedAt: number;
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PENDING: '#f59e0b',
  VERIFIED: '#3b82f6',
  FUNDED: '#8b5cf6',
  PAID: '#10b981',
  DEFAULTED: '#ef4444',
};

export default function DashboardPage() {
  const { address } = useAccount();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');

  // Read total supply from InvoiceNFT
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.invoiceNFT as `0x${string}`,
    abi: ABIS.invoiceNFT,
    functionName: 'totalSupply',
  });

  // Read statistics from InvoiceNFT
  const { data: stats } = useReadContract({
    address: CONTRACTS.invoiceNFT as `0x${string}`,
    abi: ABIS.invoiceNFT,
    functionName: 'getStatistics',
  });

  // Read Senior Vault stats
  const { data: seniorTotalAssets } = useReadContract({
    address: CONTRACTS.seniorVault as `0x${string}`,
    abi: ABIS.trancheVault,
    functionName: 'totalAssets',
  });

  const { data: seniorTotalSupply } = useReadContract({
    address: CONTRACTS.seniorVault as `0x${string}`,
    abi: ABIS.trancheVault,
    functionName: 'totalSupply',
  });

  // Read Junior Vault stats
  const { data: juniorTotalAssets } = useReadContract({
    address: CONTRACTS.juniorVault as `0x${string}`,
    abi: ABIS.trancheVault,
    functionName: 'totalAssets',
  });

  const { data: juniorTotalSupply } = useReadContract({
    address: CONTRACTS.juniorVault as `0x${string}`,
    abi: ABIS.trancheVault,
    functionName: 'totalSupply',
  });

  // Fetch all invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!totalSupply) return;

      const total = Number(totalSupply);
      const invoicePromises: Promise<Invoice | null>[] = [];

      for (let i = 1; i <= total; i++) {
        invoicePromises.push(
          fetch(`/api/invoice/${i}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
      }

      const results = await Promise.all(invoicePromises);
      setInvoices(results.filter((inv): inv is Invoice => inv !== null));
    };

    fetchInvoices();
  }, [totalSupply]);

  // Calculate platform metrics
  const totalTVL = Number(seniorTotalAssets || 0n) + Number(juniorTotalAssets || 0n);
  const seniorAPY = 8;
  const juniorAPY = 20;

  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<InvoiceStatus, number>);

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
    color: STATUS_COLORS[status as InvoiceStatus],
  }));

  // Mock historical TVL data (in production, would come from indexer)
  const tvlHistory = [
    { date: 'Dec 25', tvl: 0 },
    { date: 'Dec 26', tvl: 200 },
    { date: 'Dec 27', tvl: 450 },
    { date: 'Dec 28', tvl: 650 },
    { date: 'Dec 29', tvl: totalTVL / 1e6 },
  ];

  // Mock APY history
  const apyHistory = [
    { date: 'Dec 25', senior: 8, junior: 20 },
    { date: 'Dec 26', senior: 8.2, junior: 19.5 },
    { date: 'Dec 27', senior: 7.9, junior: 20.3 },
    { date: 'Dec 28', senior: 8.1, junior: 20.1 },
    { date: 'Dec 29', senior: seniorAPY, junior: juniorAPY },
  ];

  const filteredInvoices = statusFilter === 'ALL'
    ? invoices
    : invoices.filter(inv => inv.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Platform Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Value Locked"
          value={`$${(totalTVL / 1e6).toLocaleString()}`}
          subtitle="Across all vaults"
          trend="+12.5%"
        />
        <MetricCard
          title="Total Invoices"
          value={totalSupply?.toString() || '0'}
          subtitle="Minted on platform"
          trend="+2"
        />
        <MetricCard
          title="Funded Value"
          value={`$${stats ? (Number(stats[1]) / 1e6).toLocaleString() : '0'}`}
          subtitle={`${stats?.[0] || 0} invoices funded`}
        />
        <MetricCard
          title="Default Rate"
          value={stats && stats[0] > 0n ? `${((Number(stats[3]) / Number(stats[0])) * 100).toFixed(1)}%` : '0%'}
          subtitle={`${stats?.[3] || 0} defaults`}
          trend="0%"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* TVL Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Total Value Locked</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tvlHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="tvl" stroke="#3b82f6" strokeWidth={2} name="TVL ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* APY Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Vault APY Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={apyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="senior" stroke="#10b981" strokeWidth={2} name="Senior APY (%)" />
              <Line type="monotone" dataKey="junior" stroke="#8b5cf6" strokeWidth={2} name="Junior APY (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Invoice Distribution & Vault Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Invoice Status Distribution */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Invoice Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No invoices minted yet
            </div>
          )}
        </div>

        {/* Vault Statistics */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Vault Statistics</h2>
          <div className="space-y-6">
            <VaultStats
              name="Senior Vault"
              tvl={Number(seniorTotalAssets || 0n) / 1e6}
              apy={seniorAPY}
              shares={Number(seniorTotalSupply || 0n) / 1e18}
              color="#10b981"
            />
            <VaultStats
              name="Junior Vault"
              tvl={Number(juniorTotalAssets || 0n) / 1e6}
              apy={juniorAPY}
              shares={Number(juniorTotalSupply || 0n) / 1e18}
              color="#8b5cf6"
            />
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">All Invoices</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'ALL')}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="FUNDED">Funded</option>
            <option value="PAID">Paid</option>
            <option value="DEFAULTED">Defaulted</option>
          </select>
        </div>

        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Token ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Debtor</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Face Value</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Discounted Value</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Maturity</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.tokenId} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-white">#{invoice.tokenId}</td>
                    <td className="py-3 px-4 text-gray-300">{invoice.debtorName}</td>
                    <td className="py-3 px-4 text-white">${Number(invoice.faceValue).toLocaleString()}</td>
                    <td className="py-3 px-4 text-green-400">${Number(invoice.discountedValue).toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(invoice.maturityDate * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${STATUS_COLORS[invoice.status]}20`,
                          color: STATUS_COLORS[invoice.status],
                        }}
                      >
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            {statusFilter === 'ALL' ? 'No invoices minted yet' : `No ${statusFilter.toLowerCase()} invoices`}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
}) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <div className="flex items-center gap-2">
        <p className="text-gray-500 text-sm">{subtitle}</p>
        {trend && (
          <span className={`text-sm font-medium ${trend.startsWith('+') ? 'text-green-400' : 'text-gray-400'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function VaultStats({
  name,
  tvl,
  apy,
  shares,
  color,
}: {
  name: string;
  tvl: number;
  apy: number;
  shares: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-lg font-semibold text-white">{name}</h3>
      </div>
      <div className="grid grid-cols-3 gap-4 ml-5">
        <div>
          <p className="text-gray-400 text-sm">TVL</p>
          <p className="text-white font-semibold">${tvl.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">APY</p>
          <p className="text-white font-semibold">{apy}%</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Shares</p>
          <p className="text-white font-semibold">{shares.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
