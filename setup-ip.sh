#!/bin/bash
# =============================================================================
# DID Platform - Automatic IP Configuration (Mac/Linux)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "============================================="
echo "  DID Platform - Auto IP Setup"
echo "============================================="
echo ""

# ── Detect IP ──────────────────────────────────
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$IP" ]; then
    echo "Could not auto-detect IP."
    read -p "Enter your IP address: " IP
else
    echo "Detected IP: $IP"
    read -p "Press Enter to use this IP, or type a different one: " OVERRIDE
    if [ -n "$OVERRIDE" ]; then
        IP="$OVERRIDE"
    fi
fi

echo ""
echo "Using IP: $IP"
echo ""

# ── Update config files ─────────────────────────
echo "Updating config files..."

# portal/.env.local
cat > "$SCRIPT_DIR/portal/.env.local" <<EOF
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=http://$IP:3001
VITE_NODE_ENV=development
EOF
echo "  Updated: portal/.env.local"

# portal/vite.config.ts - update proxy target
sed -i.bak "s|target: 'http://[^']*:3001'|target: 'http://$IP:3001'|g" "$SCRIPT_DIR/portal/vite.config.ts" && rm -f "$SCRIPT_DIR/portal/vite.config.ts.bak"
echo "  Updated: portal/vite.config.ts"

# backend/.env.development - PRIMARY_HOST_IP only
sed -i.bak "s|PRIMARY_HOST_IP=.*|PRIMARY_HOST_IP=$IP|g" "$SCRIPT_DIR/backend/.env.development" && rm -f "$SCRIPT_DIR/backend/.env.development.bak"
echo "  Updated: backend/.env.development"

# wallet/.env - full rewrite
cat > "$SCRIPT_DIR/wallet/.env" <<EOF
# Auto-updated by setup-ip.sh
EXPO_PUBLIC_API_URL=http://$IP:3001
EXPO_PUBLIC_API_URL_FALLBACK_1=http://localhost:3001
EXPO_PUBLIC_NETWORK_TIMEOUT=10000
EXPO_PUBLIC_AUTO_DISCOVER=true
EXPO_PUBLIC_CHAIN_ID=11155111
EXPO_PUBLIC_NETWORK=sepolia
EOF
echo "  Updated: wallet/.env"

echo ""
echo "============================================="
echo "  Done! IP set to: $IP"
echo "============================================="
echo ""
echo "Next steps:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd portal  && npm run dev"
echo "  Terminal 3: cd wallet  && npx expo start --clear"
echo ""
