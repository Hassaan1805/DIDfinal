#!/bin/bash

echo "========================================"
echo "Quick Gas Fix Verification"
echo "========================================"
echo ""

echo "[1/3] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found!"
    exit 1
fi
echo "✓ Node.js found: $(node --version)"

echo ""
echo "[2/3] Checking backend directory..."
if [ ! -f "backend/package.json" ]; then
    echo "ERROR: Backend directory not found!"
    exit 1
fi
echo "✓ Backend directory found"

echo ""
echo "[3/3] Building backend..."
cd backend || exit 1
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    echo "Check the error messages above"
    exit 1
fi

echo ""
echo "========================================"
echo "✓ Build successful!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Check wallet balance: npm run sepolia:status"
echo "  2. Fund wallet if needed: https://sepoliafaucet.com/"
echo "  3. Start backend: npm run dev"
echo "  4. Test authentication"
echo ""
echo "For detailed troubleshooting, see GAS_TROUBLESHOOTING.md"
echo ""

cd ..
