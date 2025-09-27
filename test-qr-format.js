console.log('🔍 Testing QR Format Compatibility...\n');

// Test the exact QR data that's being generated
fetch('http://localhost:3001/api/auth/challenge')
  .then(response => response.json())
  .then(data => {
    console.log('✅ API Response received');
    
    if (data.success) {
      const qrData = data.data.qrCodeData;
      console.log('\n📱 Raw QR Data String:');
      console.log(qrData);
      
      try {
        const parsedQR = JSON.parse(qrData);
        console.log('\n🔍 Parsed QR Object:');
        console.log(JSON.stringify(parsedQR, null, 2));
        
        console.log('\n✅ Format Check:');
        console.log(`- Has 'type' field: ${parsedQR.type ? '✅' : '❌'}`);
        console.log(`- Type value: "${parsedQR.type}"`);
        console.log(`- Expected by Flutter: "did_auth"`);
        console.log(`- Match: ${parsedQR.type === 'did_auth' ? '✅ YES' : '❌ NO'}`);
        
        console.log('\n📋 All QR Fields:');
        Object.keys(parsedQR).forEach(key => {
          console.log(`- ${key}: ${parsedQR[key]}`);
        });
        
        console.log('\n🎯 Flutter App Compatibility:');
        if (parsedQR.type === 'did_auth') {
          console.log('✅ QR format is COMPATIBLE with Flutter wallet');
        } else {
          console.log('❌ QR format is NOT compatible - Flutter expects type: "did_auth"');
        }
        
      } catch (e) {
        console.error('❌ Failed to parse QR data as JSON:', e.message);
      }
    } else {
      console.error('❌ API returned success: false');
    }
  })
  .catch(err => {
    console.error('❌ Failed to fetch QR data:', err.message);
  });
