#!/bin/bash

echo "================================================"
echo "Starting DID Wallet Development"
echo "================================================"
echo ""

# Check if .env exists
if [ ! -f "wallet/.env" ]; then
    echo "Warning: wallet/.env not found!"
    echo "Creating from .env.example..."
    cp wallet/.env.example wallet/.env
    echo ""
    echo "Please update the IP address in wallet/.env"
    echo "Run ./update-wallet-ip.sh to configure automatically"
    echo ""
    exit 1
fi

echo "Starting Expo development server..."
echo ""
echo "Scan the QR code with Expo Go app to run on your phone"
echo ""

cd wallet
npm start
