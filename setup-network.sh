#!/bin/bash

# ========================================
# DIDfinal Network Configuration Script
# Automatically updates IP addresses across the project
# ========================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================"
echo "DIDfinal Network Configuration"
echo -e "======================================${NC}\n"

# Check if IP address is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No IP address provided${NC}"
    echo "Usage: ./setup-network.sh <YOUR_IP_ADDRESS>"
    echo "Example: ./setup-network.sh 192.168.0.50"
    exit 1
fi

NEW_IP=$1
OLD_IP="192.168.1.100"

echo -e "${YELLOW}Old IP:${NC} $OLD_IP"
echo -e "${YELLOW}New IP:${NC} $NEW_IP"
echo ""

# Validate IP format
if [[ ! $NEW_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo -e "${RED}Error: Invalid IP address format${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Creating environment files...${NC}"

# Backend environment
cat > backend/.env.development << EOF
LOCAL_IP=$NEW_IP
PORT=3001
ETHEREUM_RPC_URL=http://127.0.0.1:8545
DID_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
GAS_STATION_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
JWT_SECRET=your-secure-jwt-secret-key
COMPANY_DID=did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8
NODE_ENV=development
DEMO_MODE=true
EOF

echo "✅ Created backend/.env.development"

# Portal environment
cat > portal/.env << EOF
VITE_API_BASE_URL=http://$NEW_IP:3001/api
VITE_CERTIFICATE_API_URL=http://127.0.0.1:5000
VITE_FRONTEND_URL=http://localhost:5173
VITE_NODE_ENV=development
EOF

echo "✅ Created portal/.env"

# Certificate backend environment
cat > certificate_backend/.env << EOF
DB_USER=root
DB_PASSWORD=tiger
DB_HOST=localhost
DB_NAME=certificate_auth
DB_PORT=3306
PORT=5000
DEBUG=True
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:5173,http://$NEW_IP:3001,http://127.0.0.1:5500
OUTPUT_DIR=certificates
PROOF_DIR=zk_proofs
EOF

echo "✅ Created certificate_backend/.env"

echo -e "\n${GREEN}Step 2: Updating hardcoded IPs in source files...${NC}"

# Update backend source files
if [ -f "backend/src/app.ts" ]; then
    sed -i.bak "s/$OLD_IP/$NEW_IP/g" backend/src/app.ts
    echo "✅ Updated backend/src/app.ts"
fi

if [ -f "backend/src/routes/auth.ts" ]; then
    sed -i.bak "s/$OLD_IP/$NEW_IP/g" backend/src/routes/auth.ts
    echo "✅ Updated backend/src/routes/auth.ts"
fi

# Update portal source files
if [ -f "portal/src/EnterprisePortalProfessional.tsx" ]; then
    sed -i.bak "s/$OLD_IP/$NEW_IP/g" portal/src/EnterprisePortalProfessional.tsx
    echo "✅ Updated portal/src/EnterprisePortalProfessional.tsx"
fi

if [ -f "portal/src/utils/api.ts" ]; then
    sed -i.bak "s/$OLD_IP/$NEW_IP/g" portal/src/utils/api.ts
    echo "✅ Updated portal/src/utils/api.ts"
fi

if [ -f "portal/src/pages/LoginPage.tsx" ]; then
    sed -i.bak "s/$OLD_IP/$NEW_IP/g" portal/src/pages/LoginPage.tsx
    echo "✅ Updated portal/src/pages/LoginPage.tsx"
fi

if [ -f "portal/vite.config.ts" ]; then
    sed -i.bak "s/$OLD_IP/$NEW_IP/g" portal/vite.config.ts
    echo "✅ Updated portal/vite.config.ts"
fi

echo -e "\n${GREEN}Step 3: Cleaning up backup files...${NC}"
find . -name "*.bak" -type f -delete
echo "✅ Removed .bak files"

echo -e "\n${GREEN}======================================"
echo "Configuration Complete!"
echo -e "======================================${NC}\n"

echo "📝 Summary:"
echo "   New IP address: $NEW_IP"
echo "   Files updated: 9"
echo ""
echo "🔧 Next steps:"
echo "   1. Rebuild backend: cd backend && npm run build"
echo "   2. Restart backend: npm start"
echo "   3. Restart portal: cd portal && npm run dev"
echo "   4. Restart certificate backend: cd certificate_backend && python auth.py"
echo ""
echo "📱 Mobile App:"
echo "   Update API URL in mobile_wallet/lib/config.dart to: http://$NEW_IP:3001/api"
echo ""
echo -e "${GREEN}Done! Your project is now configured for IP: $NEW_IP${NC}"
