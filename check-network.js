#!/usr/bin/env node

const os = require('os');
const { execSync } = require('child_process');

console.log('🔍 Network Configuration Checker\n');
console.log('=' .repeat(60));

// Get network interfaces
const interfaces = os.networkInterfaces();
const localIPs = [];

console.log('\n📡 Your Computer\'s IP Addresses:\n');

Object.keys(interfaces).forEach((iface) => {
  interfaces[iface].forEach((details) => {
    if (details.family === 'IPv4' && !details.internal) {
      localIPs.push(details.address);
      console.log(`   ${iface}: ${details.address}`);
    }
  });
});

if (localIPs.length === 0) {
  console.log('   ❌ No external IPv4 addresses found!');
} else {
  console.log(`\n✅ Found ${localIPs.length} network interface(s)`);
}

// Check if backend is running
console.log('\n🔍 Checking Backend Server...\n');

const http = require('http');

function checkBackend(ip) {
  return new Promise((resolve) => {
    const req = http.get(`http://${ip}:3001/api/health`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ip, status: 'running', data });
        } else {
          resolve({ ip, status: 'error', code: res.statusCode });
        }
      });
    });

    req.on('error', () => resolve({ ip, status: 'offline' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ip, status: 'timeout' });
    });
  });
}

async function checkAllIPs() {
  const results = await Promise.all(localIPs.map(checkBackend));
  
  results.forEach(({ ip, status, data, code }) => {
    if (status === 'running') {
      console.log(`   ✅ ${ip}:3001 - Backend is RUNNING`);
    } else if (status === 'timeout') {
      console.log(`   ⏱️  ${ip}:3001 - Connection timeout (firewall?)`);
    } else if (status === 'error') {
      console.log(`   ❌ ${ip}:3001 - HTTP ${code}`);
    } else {
      console.log(`   ❌ ${ip}:3001 - Backend is OFFLINE`);
    }
  });

  const working = results.find(r => r.status === 'running');
  
  if (working) {
    console.log(`\n🎉 Backend is accessible at: http://${working.ip}:3001\n`);
    console.log('=' .repeat(60));
    console.log('\n📝 TO FIX WALLET TIMEOUT:\n');
    console.log('1. Open: wallet/src/config/config.ts');
    console.log(`2. Change line 13 to: const BACKEND_IP = '${working.ip}';`);
    console.log('3. Save the file');
    console.log('4. Restart wallet: npm start\n');
    console.log('5. Make sure your phone is on the SAME Wi-Fi network!\n');
    console.log('=' .repeat(60));
  } else {
    console.log('\n❌ Backend is not accessible on any network interface!');
    console.log('\n💡 Possible Solutions:');
    console.log('   1. Start the backend: cd backend && npm run dev');
    console.log('   2. Check firewall settings (allow port 3001)');
    console.log('   3. Ensure backend is bound to 0.0.0.0 (not localhost)');
    console.log('   4. Check backend/.env: HOST=0.0.0.0\n');
  }
}

checkAllIPs().catch(console.error);
