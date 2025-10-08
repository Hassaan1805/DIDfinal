#!/bin/bash
# Automated Setup Script for DID Platform on New Linux/macOS System
# This script will configure everything needed to run the platform

set -e  # Exit on any error

echo "🚀 DID Platform - New System Setup"
echo "====================================="
echo ""
echo "This script will:"
echo "1. Detect your system IP address"
echo "2. Install dependencies"
echo "3. Configure environment files"
echo "4. Set up firewall rules (if needed)"
echo "5. Create start scripts"
echo ""
read -p "Press Enter to continue..."

# Detect system IP address
echo "📡 Detecting system IP address..."
if command -v hostname &> /dev/null; then
    SYSTEM_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "")
fi

# Fallback method for macOS
if [ -z "$SYSTEM_IP" ]; then
    SYSTEM_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)
fi

# Remove any trailing spaces or characters
SYSTEM_IP=$(echo "$SYSTEM_IP" | tr -d ' \n\r')

if [ -z "$SYSTEM_IP" ]; then
    echo "❌ Could not detect system IP automatically."
    read -p "Please enter your system's IP address: " SYSTEM_IP
fi

echo "✅ System IP: $SYSTEM_IP"
echo ""

# Check if Node.js is installed
echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js found: $NODE_VERSION"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found! Please install npm"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
fi
echo "✅ Backend dependencies installed"

# Configure backend environment
echo "⚙️ Configuring backend for IP: $SYSTEM_IP"
cat > .env.development << EOF
PORT=3001
NODE_ENV=development
HOST=0.0.0.0
DEMO_MODE=true
JWT_SECRET=dev_jwt_secret_2024_new_system
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key_here
SEPOLIA_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
CORS_ORIGINS=http://localhost:5173,http://$SYSTEM_IP:5173,http://localhost:3000
EOF

echo "✅ Backend configured for $SYSTEM_IP:3001"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../portal
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
fi
echo "✅ Frontend dependencies installed"

# Configure frontend environment
echo "⚙️ Configuring frontend for IP: $SYSTEM_IP"
cat > .env.development << EOF
VITE_API_BASE_URL=http://$SYSTEM_IP:3001/api
VITE_API_URL=/api
VITE_DEV_MODE=true
VITE_DEBUG_API=true
VITE_HOT_RELOAD=true
VITE_NODE_ENV=development
EOF

cat > .env.local << EOF
VITE_API_BASE_URL=http://$SYSTEM_IP:3001/api
VITE_NODE_ENV=development
VITE_DEBUG=true
EOF

echo "✅ Frontend configured for $SYSTEM_IP:5173"

# Configure firewall for Ubuntu/Debian (optional)
echo "🔥 Checking firewall configuration..."
if command -v ufw &> /dev/null; then
    echo "Setting up UFW firewall rules..."
    sudo ufw allow 3001 &>/dev/null || echo "Note: Could not configure UFW (may need manual setup)"
    sudo ufw allow 5173 &>/dev/null || echo "Note: Could not configure UFW (may need manual setup)"
    echo "✅ Firewall rules configured (if permissions allow)"
else
    echo "ℹ️ UFW not found - manual firewall configuration may be needed"
fi

# Go back to root directory
cd ..

# Create start script
echo "📝 Creating start script..."
cat > start-platform.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting DID Platform..."
EOF

echo "echo \"Backend: http://$SYSTEM_IP:3001/api/health\"" >> start-platform.sh
echo "echo \"Frontend: http://$SYSTEM_IP:5173\"" >> start-platform.sh
echo "echo \"Mobile Access: Use $SYSTEM_IP:3001 in mobile app\"" >> start-platform.sh

cat >> start-platform.sh << 'EOF'
echo ""

# Function to start backend
start_backend() {
    echo "Starting backend..."
    cd backend
    npm run start &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "Starting frontend..."
    cd portal
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
}

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start services
start_backend
sleep 5  # Wait for backend to start
start_frontend

echo ""
echo "✅ Services started!"
EOF

echo "echo \"✅ Backend: http://$SYSTEM_IP:3001/api/health\"" >> start-platform.sh
echo "echo \"✅ Frontend: http://$SYSTEM_IP:5173\"" >> start-platform.sh
echo "echo \"✅ Mobile: Use IP $SYSTEM_IP:3001\"" >> start-platform.sh

cat >> start-platform.sh << 'EOF'
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for services
wait
EOF

chmod +x start-platform.sh

# Create test script
echo "📝 Creating test script..."
cat > test-platform.sh << EOF
#!/bin/bash
echo "🧪 Testing DID Platform deployment..."
echo ""

# Test backend health
echo "Testing backend health..."
BACKEND_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://$SYSTEM_IP:3001/api/health 2>/dev/null || echo "000")
if [ "\$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Failed (Status: \$BACKEND_STATUS)"
fi

# Test frontend
echo "Testing frontend..."
FRONTEND_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://$SYSTEM_IP:5173 2>/dev/null || echo "000")
if [ "\$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend: Accessible"
else
    echo "❌ Frontend: Failed (Status: \$FRONTEND_STATUS)"
fi

# Test QR code generation
echo "Testing QR code generation..."
QR_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" -X POST http://$SYSTEM_IP:3001/api/auth/challenge 2>/dev/null || echo "000")
if [ "\$QR_STATUS" = "200" ]; then
    echo "✅ QR Code API: Working"
else
    echo "❌ QR Code API: Failed (Status: \$QR_STATUS)"
fi

echo ""
echo "🎉 Deployment test complete!"
EOF

chmod +x test-platform.sh

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your DID Platform is configured for:"
echo "  Backend:  http://$SYSTEM_IP:3001/api/health"
echo "  Frontend: http://$SYSTEM_IP:5173"
echo "  Mobile:   Configure app to use $SYSTEM_IP:3001"
echo ""
echo "📱 Mobile App Setup:"
echo "1. Install app-release.apk on your Android device"
echo "2. Ensure device is on same WiFi network"
echo "3. App will auto-discover backend at $SYSTEM_IP:3001"
echo ""
echo "🚀 To start the platform:"
echo "  ./start-platform.sh"
echo ""
echo "🧪 To test the platform:"
echo "  ./test-platform.sh"
echo ""
echo "📋 Manual start commands:"
echo "  Backend:  cd backend && npm run start"
echo "  Frontend: cd portal && npm run dev"
echo ""

read -p "Would you like to start the platform now? (y/N): " START_NOW
if [[ $START_NOW =~ ^[Yy]$ ]]; then
    echo "Starting platform..."
    ./start-platform.sh
else
    echo "Platform ready! Run ./start-platform.sh when ready."
fi

echo ""
echo "📋 Quick Test Commands:"
echo "  curl http://$SYSTEM_IP:3001/api/health"
echo "  curl http://$SYSTEM_IP:5173"
echo ""