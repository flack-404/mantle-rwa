# IPFS Integration for Invoice PDFs

## Overview

The platform includes IPFS integration for storing invoice PDF documents in a decentralized manner. The integration supports both **demo mode** (for testing) and **production mode** (with Pinata).

## Implementation

### IPFS Utility (`lib/ipfs.ts`)

Located at `frontend/lib/ipfs.ts`, this module provides:

- `uploadToIPFS(file: File)` - Upload a PDF to IPFS
- `getIPFSUrl(hash: string)` - Get gateway URL from hash
- `isIPFSDemoMode()` - Check if running in demo mode

### Demo Mode (Default)

By default, IPFS runs in demo mode, which:
- Simulates uploads without requiring API keys
- Generates mock IPFS hashes based on file properties
- Returns mock gateway URLs
- Perfect for hackathon demos and local testing

### Production Mode

To enable real IPFS uploads via Pinata:

1. **Get Pinata API Key**:
   - Sign up at [https://pinata.cloud](https://pinata.cloud)
   - Generate a JWT token from Dashboard → API Keys

2. **Set Environment Variable**:
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here
   ```

3. **Restart Frontend**:
   ```bash
   npm run dev
   ```

## Usage in Business Interface

### Adding PDF Upload to Invoice Minting

```typescript
import { uploadToIPFS, isIPFSDemoMode } from '@/lib/ipfs';
import { useState } from 'react';

export default function BusinessPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setPdfFile(file);

    // Upload to IPFS
    try {
      const result = await uploadToIPFS(file);
      setIpfsHash(result.hash);
      console.log('Uploaded to IPFS:', result);
    } catch (error) {
      console.error('IPFS upload failed:', error);
      alert('Failed to upload PDF to IPFS');
    }
  };

  const handleMintInvoice = async () => {
    // ... existing mint logic ...

    // Include IPFS hash in invoice metadata
    const invoiceMetadata = {
      faceValue: formData.faceValue,
      debtorName: formData.debtorName,
      ipfsHash: ipfsHash, // Store IPFS hash
      // ... other fields
    };

    // Mint invoice with IPFS hash
    // The hash can be stored in InvoiceNFT's metadata
  };

  return (
    <div>
      {/* PDF Upload Input */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">
          Invoice PDF {isIPFSDemoMode() && '(Demo Mode)'}
        </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          className="w-full bg-gray-700 text-white rounded-lg p-3"
        />
        {ipfsHash && (
          <p className="text-green-400 text-sm mt-2">
            ✅ Uploaded to IPFS: {ipfsHash.substring(0, 20)}...
          </p>
        )}
      </div>

      {/* Rest of the form ... */}
    </div>
  );
}
```

### Displaying PDFs from IPFS

```typescript
import { getIPFSUrl } from '@/lib/ipfs';

function InvoiceDetails({ ipfsHash }: { ipfsHash: string }) {
  const pdfUrl = getIPFSUrl(ipfsHash);

  return (
    <div>
      <h3>Invoice Document</h3>
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline"
      >
        View PDF on IPFS
      </a>

      {/* Embedded PDF viewer */}
      <iframe
        src={pdfUrl}
        width="100%"
        height="600px"
        className="mt-4 border border-gray-700 rounded-lg"
      />
    </div>
  );
}
```

## Smart Contract Integration

### Option 1: Store IPFS Hash On-Chain

Modify `InvoiceNFT.sol` to include IPFS hash:

```solidity
struct Invoice {
    // ... existing fields ...
    string ipfsHash;  // Add this field
}

function mintInvoice(
    uint256 _faceValue,
    uint256 _maturityDate,
    address _debtor,
    bytes32 _invoiceHash,
    string memory _debtorName,
    uint256 _discountRate,
    string memory _ipfsHash  // Add this parameter
) external onlyRole(ISSUER_ROLE) returns (uint256) {
    // ... existing logic ...
    invoice.ipfsHash = _ipfsHash;
    // ...
}
```

### Option 2: Store in NFT Metadata (ERC-721)

```solidity
// Use tokenURI to return metadata JSON
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    Invoice memory invoice = invoices[tokenId];

    string memory json = Base64.encode(bytes(string(abi.encodePacked(
        '{"name": "Invoice #', Strings.toString(tokenId), '",',
        '"description": "Tokenized invoice from ', invoice.debtorName, '",',
        '"attributes": [',
            '{"trait_type": "Face Value", "value": "', Strings.toString(invoice.faceValue), '"},',
            '{"trait_type": "Status", "value": "', getStatusString(invoice.status), '"}',
        '],',
        '"document": "ipfs://', invoice.ipfsHash, '"',
        '}'
    ))));

    return string(abi.encodePacked('data:application/json;base64,', json));
}
```

## Indexer Integration

Update the indexer to track IPFS hashes:

```typescript
// In eventListener.js
invoiceNFT.on('InvoiceMinted', async (tokenId, issuer, faceValue, debtor, event) => {
  const invoice = await invoiceNFT.getInvoice(tokenId);

  await prisma.invoice.create({
    data: {
      // ... existing fields ...
      ipfsHash: invoice.ipfsHash,  // Add IPFS hash
    },
  });
});
```

Add to Prisma schema:

```prisma
model Invoice {
  // ... existing fields ...
  ipfsHash  String?  @map("ipfs_hash")
}
```

## Security Considerations

1. **File Validation**:
   - Always validate file type (PDF only)
   - Check file size limits (e.g., max 10MB)
   - Sanitize filenames

2. **Access Control**:
   - IPFS files are public by default
   - For sensitive invoices, consider:
     - Encryption before upload
     - Access control via signed URLs
     - Private IPFS networks

3. **Cost Management**:
   - Pinata free tier: 1GB storage, 100GB bandwidth
   - Monitor usage to avoid unexpected charges
   - Consider implementing upload limits per user

## Testing

```bash
# Test IPFS integration
cd frontend

# Demo mode (no API key needed)
npm run dev

# Production mode
NEXT_PUBLIC_PINATA_JWT=your_token npm run dev
```

## Alternative IPFS Providers

Instead of Pinata, you can use:

- **Infura IPFS**: `https://infura.io`
- **Web3.Storage**: `https://web3.storage`
- **Fleek**: `https://fleek.co`

Update `lib/ipfs.ts` with the respective API endpoints.

## Troubleshooting

### "Failed to upload PDF to IPFS"

- Check Pinata JWT token is valid
- Verify file size is under limit
- Check network connection

### "IPFS gateway slow to load"

- IPFS can take 10-30 seconds for first load
- Use multiple gateways for redundancy
- Consider caching frequently accessed files

### Demo mode not switching to production

- Ensure `.env.local` exists (not `.env`)
- Verify environment variable name: `NEXT_PUBLIC_PINATA_JWT`
- Restart Next.js dev server

## Future Enhancements

1. **Bulk Upload**: Upload multiple invoices at once
2. **Compression**: Compress PDFs before upload
3. **Preview**: Show PDF preview before upload
4. **Versioning**: Track invoice document versions
5. **Encryption**: Encrypt sensitive invoices
6. **NFT.Storage**: Use NFT.Storage for permanent storage

## License

MIT
