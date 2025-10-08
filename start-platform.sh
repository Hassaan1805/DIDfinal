#!/bin/bash

# Comprehensive DID Platform Startup Script
# This script ensures all components start correctly and are accessible

echo "🚀 Starting Decentralized Trust Platform..."
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    if netstat -tulpn 2>/dev/null | grep :$1 > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    echo -e "${YELLOW}Killing process on port $1...${NC}"
    fuser -k $1/tcp 2>/dev/null || true
    sleep 2
}

# Kill any existing processes
echo -e "${BLUE}Step 1: Cleaning up existing processes...${NC}"
kill_port 3001  # Backend
kill_port 5173  # Frontend

# Start Backend
echo -e "${BLUE}Step 2: Starting Backend Server...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

# Copy environment file
if [ ! -f ".env" ]; then
    cp .env.development .env
    echo -e "${GREEN}Created backend .env file${NC}"
fi

# Start backend in background
npm run dev &
BACKEND_PID=$!
echo -e "${GREEN}Backend started with PID: $BACKEND_PID${NC}"

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
for i in {1..30}; do
    if check_port 3001; then
        echo -e "${GREEN}Backend is running on port 3001${NC}"
        break
    fi
    sleep 1
done

# Test backend health
echo -e "${BLUE}Step 3: Testing Backend Health...${NC}"
sleep 3
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${RED}❌ Backend health check failed (HTTP $HEALTH_CHECK)${NC}"
fi

# Start Frontend
cd ../portal
echo -e "${BLUE}Step 4: Starting Frontend Portal...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Copy environment file
if [ ! -f ".env.local" ]; then
    echo "VITE_API_BASE_URL=http://192.168.1.100:3001/api" > .env.local
    echo -e "${GREEN}Created frontend .env.local file${NC}"
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started with PID: $FRONTEND_PID${NC}"

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
for i in {1..30}; do
    if check_port 5173; then
        echo -e "${GREEN}Frontend is running on port 5173${NC}"
        break
    fi
    sleep 1
done

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)

echo ""
echo -e "${GREEN}🎉 Decentralized Trust Platform Started Successfully!${NC}"
echo "============================================="
echo -e "${BLUE}Backend API:${NC}     http://localhost:3001/api/health"
echo -e "${BLUE}Frontend Portal:${NC} http://localhost:5173"
echo -e "${BLUE}Network Access:${NC}  http://$LOCAL_IP:3001/api/health"
echo -e "${BLUE}Mobile Access:${NC}   http://$LOCAL_IP:5173"
echo ""
echo -e "${YELLOW}🔧 Testing URLs:${NC}"
echo -e "  Backend Health: curl http://localhost:3001/api/health"
echo -e "  Challenge API:  curl -X POST http://localhost:3001/api/auth/challenge"
echo -e "  DID Wallet:     http://localhost:5173/secure-wallet-local.html"
echo ""
echo -e "${BLUE}📱 For Mobile Testing:${NC}"
echo -e "  Update mobile app to use: http://$LOCAL_IP:3001"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and handle cleanup
trap 'echo -e "${YELLOW}Shutting down services...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT

# Monitor services
while true; do
    sleep 10
    
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Backend process died${NC}"
        break
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Frontend process died${NC}"
        break
    fi
    
    # Optional: Check health endpoints
    # Uncomment below for continuous health monitoring
    # HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    # if [ "$HEALTH_CHECK" != "200" ]; then
    #     echo -e "${RED}⚠️  Backend health check failed${NC}"
    # fi
done