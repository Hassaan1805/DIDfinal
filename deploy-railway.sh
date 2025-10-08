#!/bin/bash

# Railway Deployment Script for Decentralized Trust Platform
# This script helps deploy both backend and portal to Railway

echo "🚀 Decentralized Trust Platform - Railway Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed!"
    echo "Please install it with: npm install -g @railway/cli"
    echo "Or visit: https://railway.app/cli"
    exit 1
fi

print_success "Railway CLI is installed"

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    print_warning "You need to login to Railway first"
    echo "Running: railway login"
    railway login
fi

print_success "Railway authentication verified"

# Create Railway project
echo ""
print_status "Creating Railway project..."
railway login

# Check if already in a Railway project
if railway status &> /dev/null; then
    print_warning "Already in a Railway project"
    railway status
else
    print_status "Creating new Railway project..."
    railway init
fi

echo ""
print_status "Deploying Backend Service..."
echo "----------------------------"

# Deploy backend
cd backend
print_status "Setting up backend service..."

# Create backend service if it doesn't exist
railway add --name "did-platform-backend"

# Set environment variables for backend
print_status "Setting backend environment variables..."
railway variables set NODE_ENV=production
railway variables set DEMO_MODE=true
railway variables set JWT_SECRET="71a4602d351070b66439bf41cf7fc34b55a58a128ac85978b77cf26e9e9edf58e407cb30351e55af9317c8110128c6a3984e0f6759b576923d85dc58eea9c37b"
railway variables set ETHEREUM_RPC_URL="https://sepolia.infura.io/v3/8442a43de5054ce0a632622b78fab286"
railway variables set CONTRACT_ADDRESS="0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48"
railway variables set GAS_STATION_PRIVATE_KEY="0x4c72f5e50ef5c4a2a3d7e3b5a1f8e9d6c3b0a7e4d1c8b5a2f9e6d3c0b7a4e1f8"

# Deploy backend
print_status "Deploying backend..."
railway up

# Get backend URL
BACKEND_URL=$(railway domain)
print_success "Backend deployed at: $BACKEND_URL"

cd ..

echo ""
print_status "Deploying Portal Service..."
echo "----------------------------"

# Deploy portal
cd portal

# Create portal service
railway add --name "did-platform-portal"

# Set environment variables for portal
print_status "Setting portal environment variables..."
railway variables set NODE_ENV=production
railway variables set VITE_API_BASE_URL="$BACKEND_URL/api"
railway variables set VITE_BACKEND_URL="$BACKEND_URL"
railway variables set VITE_CONTRACT_ADDRESS="0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48"
railway variables set VITE_DEMO_MODE=true

# Deploy portal
print_status "Deploying portal..."
railway up

# Get portal URL
PORTAL_URL=$(railway domain)
print_success "Portal deployed at: $PORTAL_URL"

cd ..

echo ""
print_success "🎉 Deployment Complete!"
echo "======================="
echo "Backend URL:  $BACKEND_URL"
echo "Portal URL:   $PORTAL_URL"
echo ""
echo "📱 Mobile App Configuration:"
echo "Update your mobile app to use: $BACKEND_URL"
echo ""
echo "🔧 Next Steps:"
echo "1. Test the deployed services"
echo "2. Update mobile app configuration"
echo "3. Build and test mobile app"
echo "4. Configure custom domains (optional)"
echo ""
echo "💡 Useful Commands:"
echo "railway logs          - View application logs"
echo "railway status        - Check service status"
echo "railway variables     - Manage environment variables"
echo "railway domain        - Manage custom domains"