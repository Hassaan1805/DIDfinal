#!/bin/bash

echo "========================================"
echo "Clearing Wallet Cache and Restarting"
echo "========================================"
echo ""

cd wallet || exit 1

echo "[1/4] Clearing Metro bundler cache..."
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "   ✓ Cache cleared"
else
    echo "   ✓ No cache found (already clean)"
fi

echo ""
echo "[2/4] Clearing Expo cache..."
if [ -d ".expo" ]; then
    rm -rf .expo
    echo "   ✓ Expo cache cleared"
fi

echo ""
echo "[3/4] Clearing watchman cache (if available)..."
if command -v watchman &> /dev/null; then
    watchman watch-del-all
    echo "   ✓ Watchman cache cleared"
else
    echo "   ⚠ Watchman not installed (skipping)"
fi

echo ""
echo "[4/4] Starting wallet with --clear flag..."
echo "   This will rebuild the JavaScript bundle with new config"
echo ""

npm start -- --clear

cd ..
