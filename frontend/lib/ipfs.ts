// IPFS Upload Utility (Demo Mode)
// For production, use Pinata or Infura IPFS

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// Demo mode: returns a mock IPFS hash
// To use real IPFS, set PINATA_JWT in environment variables
const DEMO_MODE = !process.env.NEXT_PUBLIC_PINATA_JWT;

export interface IPFSUploadResult {
  hash: string;
  url: string;
}

/**
 * Upload a file to IPFS via Pinata
 * @param file - File to upload
 * @returns IPFS hash and gateway URL
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  if (DEMO_MODE) {
    // Demo mode: simulate upload with mock hash
    console.log('[IPFS Demo] Simulating upload for:', file.name);

    // Generate a consistent "hash" based on file properties
    const mockHash = `Qm${btoa(file.name + file.size + file.type).substring(0, 44)}`;

    return {
      hash: mockHash,
      url: `${PINATA_GATEWAY}/${mockHash}`,
    };
  }

  // Real IPFS upload
  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        type: 'invoice',
        uploadedAt: Date.now().toString(),
      },
    });
    formData.append('pinataMetadata', metadata);

    const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      hash: data.IpfsHash,
      url: `${PINATA_GATEWAY}/${data.IpfsHash}`,
    };
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
}

/**
 * Get IPFS URL from hash
 * @param hash - IPFS hash
 * @returns Full gateway URL
 */
export function getIPFSUrl(hash: string): string {
  if (!hash) return '';

  // Remove ipfs:// prefix if present
  const cleanHash = hash.replace('ipfs://', '');

  return `${PINATA_GATEWAY}/${cleanHash}`;
}

/**
 * Check if IPFS is in demo mode
 */
export function isIPFSDemoMode(): boolean {
  return DEMO_MODE;
}
