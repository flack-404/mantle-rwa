import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { mantleSepolia } from '@/lib/contracts';
import { CONTRACTS, ABIS } from '@/lib/contracts';

const client = createPublicClient({
  chain: mantleSepolia,
  transport: http('https://rpc.sepolia.mantle.xyz'),
});

const STATUS_MAP: Record<number, string> = {
  0: 'PENDING',
  1: 'VERIFIED',
  2: 'FUNDED',
  3: 'PAID',
  4: 'DEFAULTED',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenId = parseInt(params.id);

    if (isNaN(tokenId) || tokenId < 1) {
      return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 });
    }

    // Fetch invoice data from contract
    const invoice = await client.readContract({
      address: CONTRACTS.invoiceNFT as `0x${string}`,
      abi: ABIS.invoiceNFT,
      functionName: 'getInvoice',
      args: [BigInt(tokenId)],
    }) as any;

    // Format the response
    const formattedInvoice = {
      tokenId,
      issuer: invoice.issuer,
      faceValue: (Number(invoice.faceValue) / 1e6).toString(),
      discountedValue: (Number(invoice.discountedValue) / 1e6).toString(),
      maturityDate: Number(invoice.maturityDate),
      status: STATUS_MAP[Number(invoice.status)] || 'UNKNOWN',
      debtorName: invoice.debtorName,
      fundedAt: Number(invoice.fundedAt),
    };

    return NextResponse.json(formattedInvoice);
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice', details: error.message },
      { status: 500 }
    );
  }
}
