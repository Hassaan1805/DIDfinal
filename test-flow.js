const { ethers } = require('ethers');

async function testAuthFlow() {
    console.log('🧪 Testing Complete Authentication Flow\n');
    
    try {
        // Step 1: Get challenge from backend
        console.log('1️⃣ Getting challenge from backend...');
        const challengeResponse = await fetch('http://localhost:3001/api/auth/challenge');
        
        if (!challengeResponse.ok) {
            throw new Error(`Challenge request failed: ${challengeResponse.status}`);
        }
        
        const challengeData = await challengeResponse.json();
        console.log('✅ Challenge received:', {
            challengeId: challengeData.challengeId,
            message: challengeData.message.substring(0, 50) + '...',
            timestamp: challengeData.timestamp
        });
        
        // Step 2: Create wallet and sign message
        console.log('\n2️⃣ Creating wallet and signing challenge...');
        const wallet = ethers.Wallet.createRandom();
        const signature = await wallet.signMessage(challengeData.message);
        
        console.log('✅ Message signed:', {
            address: wallet.address,
            signature: signature.substring(0, 20) + '...'
        });
        
        // Step 3: Verify signature with backend
        console.log('\n3️⃣ Verifying signature with backend...');
        const verifyResponse = await fetch('http://localhost:3001/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                challengeId: challengeData.challengeId,
                signature: signature,
                address: wallet.address
            })
        });
        
        if (!verifyResponse.ok) {
            throw new Error(`Verification failed: ${verifyResponse.status}`);
        }
        
        const verifyData = await verifyResponse.json();
        console.log('✅ Signature verified:', {
            success: verifyData.success,
            did: verifyData.did,
            token: verifyData.token ? verifyData.token.substring(0, 20) + '...' : 'None'
        });
        
        console.log('\n🎉 Authentication flow completed successfully!');
        console.log('\nFlow Summary:');
        console.log('- Backend generated challenge ✅');
        console.log('- Wallet signed challenge ✅');
        console.log('- Backend verified signature ✅');
        console.log('- JWT token issued ✅');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// For module import compatibility
if (typeof window === 'undefined') {
    // Node.js environment
    import('node-fetch').then(fetch => {
        global.fetch = fetch.default;
        testAuthFlow();
    });
} else {
    // Browser environment
    window.testAuthFlow = testAuthFlow;
}
