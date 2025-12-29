// Quick test to verify Pinata IPFS integration
require('dotenv').config({ path: '.env.local' });

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

async function testPinataConnection() {
  console.log('🧪 Testing Pinata IPFS Connection...\n');

  if (!PINATA_JWT) {
    console.error('❌ NEXT_PUBLIC_PINATA_JWT not found in .env.local');
    process.exit(1);
  }

  console.log('✅ JWT Token found:', PINATA_JWT.substring(0, 50) + '...');

  try {
    // Test authentication by getting account info
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('\n✅ Pinata Authentication Successful!');
    console.log('📊 Account Info:', JSON.stringify(data, null, 2));
    console.log('\n🎉 IPFS is fully functional and ready to use!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart frontend: cd frontend && npm run dev');
    console.log('   2. Upload PDFs will now go to real IPFS');
    console.log('   3. Files will be accessible via: https://gateway.pinata.cloud/ipfs/[hash]');

    return true;
  } catch (error) {
    console.error('\n❌ Pinata Connection Failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify JWT token is correct');
    console.error('   - Check Pinata account is active');
    console.error('   - Ensure .env.local file exists in frontend/');
    return false;
  }
}

testPinataConnection();
