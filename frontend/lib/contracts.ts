/**
 * Contract addresses and ABIs for Mantle RWA
 */

export const CHAIN_ID = 5003; // Mantle Sepolia

export const CONTRACTS = {
  mockUSDC: "0x064f744a9A923eFf04f734B4F0C59bF1caa72F56",
  invoiceNFT: "0x8CF8e5Ffe2DC4FD0b2a5ae491Be6fa38E5e641BD",
  kycGate: "0x94D60d03e1BC733352f071D25326a023f496Dac0",
  groth16Verifier: "0xA2BB7F4e60470e532D23741B05ba7E455C66B66A",
  zkKYCVerifier: "0x17359570233056Ec9bb67106AE4c513B738C18b5",
  seniorVault: "0xCE75bc6E94363f1c3756d769871aBE7428202001",
  juniorVault: "0x48Ba5Cd4692f34b68949A22074Cc7c6b41b5Ad28",
} as const;

// Mantle Sepolia network config
export const mantleSepolia = {
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.mantle.xyz'] },
    public: { http: ['https://rpc.sepolia.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantle Sepolia Explorer', url: 'https://sepolia.mantlescan.xyz' },
  },
  testnet: true,
};

// Simplified ABIs (only the functions we need in the frontend)
export const ABIS = {
  invoiceNFT: [
    "function mintInvoice(uint256 faceValue, uint256 maturityDate, address debtor, bytes32 invoiceHash, string debtorName, uint256 discountRate) returns (uint256)",
    "function getInvoice(uint256 tokenId) view returns (tuple(uint256 tokenId, uint256 faceValue, uint256 discountedValue, uint256 maturityDate, address debtor, bytes32 invoiceHash, uint8 status, uint256 paidAmount, uint256 issuedAt, address issuer, string debtorName, uint256 discountRate))",
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function getStatistics() view returns (uint256 totalFunded, uint256 valueFunded, uint256 valuePaid, uint256 valueDefaulted, uint256 totalSupply)",
    "event InvoiceMinted(uint256 indexed tokenId, address indexed issuer, uint256 faceValue, uint256 discountedValue, uint256 maturityDate, bytes32 invoiceHash)",
  ],
  kycGate: [
    "function isVerified(address user) view returns (bool)",
    "function verifyUser(address user, uint256 expiresAt, bytes32 countryHash, uint8 riskScore, string kycId, uint8 tier)",
    "function getKYCData(address user) view returns (tuple(bool isVerified, uint256 verifiedAt, uint256 expiresAt, bytes32 countryHash, uint8 riskScore, string kycId, uint8 tier))",
  ],
  mockUSDC: [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function faucet()",
    "function decimals() view returns (uint8)",
  ],
  trancheVault: [
    "function deposit(uint256 assets, address receiver) returns (uint256)",
    "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function convertToAssets(uint256 shares) view returns (uint256)",
    "function convertToShares(uint256 assets) view returns (uint256)",
    "function getUserPosition(address user) view returns (tuple(uint256 shares, uint256 assets, uint256 percentageOfVault))",
    "function getVaultStats() view returns (tuple(uint256 tvl, uint256 invoiceCount, uint256 activeInvoiceValue, uint256 totalYield, uint256 totalLoss, uint256 sharePrice, uint256 expectedAPY))",
    "function isSenior() view returns (bool)",
    "function targetAPY() view returns (uint256)",
  ],
} as const;

export const INVOICE_STATUS = {
  0: "PENDING",
  1: "VERIFIED",
  2: "FUNDED",
  3: "PAID",
  4: "DEFAULTED",
  5: "PARTIAL_PAID",
} as const;

export type InvoiceStatus = keyof typeof INVOICE_STATUS;
