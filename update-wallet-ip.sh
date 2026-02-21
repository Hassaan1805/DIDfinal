#!/bin/bash

echo "================================================"
echo "DID Wallet - Network IP Update Script"
echo "================================================"
echo ""

# Detect OS and get IP
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

echo "Your detected IP address: $IP"
echo ""
echo "Current .env content:"
cat wallet/.env 2>/dev/null || echo "No .env file found"
echo ""

read -p "Use detected IP? (Y/n): " USE_DETECTED
if [[ "$USE_DETECTED" =~ ^[Nn]$ ]]; then
    read -p "Enter your IP address: " IP
fi

echo ""
echo "Updating wallet/.env with IP: $IP"
echo ""

# Create or update .env file
cat > wallet/.env << EOF
# Backend Configuration - Updated $(date)
EXPO_PUBLIC_API_URL=http://$IP:3001

# Alternative backends (for fallback)
EXPO_PUBLIC_API_URL_FALLBACK_1=http://localhost:3001
EXPO_PUBLIC_API_URL_FALLBACK_2=https://did-platform-backend.railway.app

# Network Configuration
EXPO_PUBLIC_NETWORK_TIMEOUT=10000
EXPO_PUBLIC_AUTO_DISCOVER=true

# Blockchain Configuration
EXPO_PUBLIC_CHAIN_ID=11155111
EXPO_PUBLIC_NETWORK=sepolia
EOF

echo ""
echo "✓ Updated wallet/.env successfully!"
echo "✓ Backend URL set to: http://$IP:3001"
echo ""
echo "Next steps:"
echo "1. Restart the Expo development server if it's running"
echo "2. Refresh the app on your phone"
echo "3. Or use the Settings screen in the app to test the connection"
echo ""
