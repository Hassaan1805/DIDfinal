#!/bin/bash
# Script to copy compiled circuit files from circuits build to wallet assets

echo "Copying circuit files to wallet assets..."

# Create assets directory if it doesn't exist
mkdir -p src/assets/circuits/

# Copy WASM file
if [ -f "../circuits/build/nftOwnership.wasm" ]; then
    cp ../circuits/build/nftOwnership.wasm src/assets/circuits/
    echo "✅ Copied nftOwnership.wasm"
else
    echo "❌ nftOwnership.wasm not found. Run 'npm run compile' in circuits directory first."
fi

# Copy proving key
if [ -f "../circuits/nftOwnership_0001.zkey" ]; then
    cp ../circuits/nftOwnership_0001.zkey src/assets/circuits/nftOwnership_final.zkey
    echo "✅ Copied nftOwnership_final.zkey"
else
    echo "❌ nftOwnership_0001.zkey not found. Run 'npm run ceremony' in circuits directory first."
fi

echo "Circuit files copy complete!"
echo ""
echo "Next steps:"
echo "1. Compile circuits: cd ../circuits && npm run compile"
echo "2. Run ceremony: cd ../circuits && npm run ceremony" 
echo "3. Copy files: ./copy-circuits.sh"
echo "4. Test the app: npm start"
