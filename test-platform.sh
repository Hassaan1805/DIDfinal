#!/bin/bash

# Comprehensive DID Platform Testing Script
# Tests all components and ensures end-to-end functionality

echo "🧪 DID Platform Comprehensive Testing Suite"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL: $test_name${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    [ "$response" = "$expected_status" ]
}

# Function to check JSON endpoint
check_json_endpoint() {
    local url="$1"
    local expected_field="$2"
    
    response=$(curl -s "$url" 2>/dev/null)
    echo "$response" | grep -q "\"$expected_field\""
}

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)

echo -e "${YELLOW}Local IP detected: $LOCAL_IP${NC}"
echo ""

# 1. Backend Health Tests
echo -e "${BLUE}=== Backend Health Tests ===${NC}"
run_test "Backend Health (localhost)" "check_endpoint 'http://localhost:3001/api/health'"
run_test "Backend Health (network)" "check_endpoint 'http://$LOCAL_IP:3001/api/health'"
run_test "Backend JSON Response" "check_json_endpoint 'http://localhost:3001/api/health' 'status'"

# 2. Backend API Tests
echo -e "\n${BLUE}=== Backend API Tests ===${NC}"
run_test "Auth Challenge Generation" "check_json_endpoint 'http://localhost:3001/api/auth/challenge' 'challengeId'"
run_test "Sepolia Status Check" "check_endpoint 'http://localhost:3001/api/auth/sepolia-status'"

# 3. Frontend Tests
echo -e "\n${BLUE}=== Frontend Tests ===${NC}"
run_test "Frontend Portal (localhost)" "check_endpoint 'http://localhost:5173'"
run_test "Frontend Portal (network)" "check_endpoint 'http://$LOCAL_IP:5173'"

# 4. File Existence Tests
echo -e "\n${BLUE}=== File Structure Tests ===${NC}"
run_test "Backend environment file" "[ -f 'backend/.env.development' ]"
run_test "Frontend environment file" "[ -f 'portal/.env.local' ]"
run_test "Secure wallet file" "[ -f 'portal/public/secure-wallet-local.html' ]"
run_test "Mobile app exists" "[ -d 'mobile_wallet' ]"

# 5. Dependencies Tests
echo -e "\n${BLUE}=== Dependencies Tests ===${NC}"
run_test "Backend node_modules" "[ -d 'backend/node_modules' ]"
run_test "Frontend node_modules" "[ -d 'portal/node_modules' ]"

# 6. Configuration Tests
echo -e "\n${BLUE}=== Configuration Tests ===${NC}"
run_test "Backend TypeScript config" "[ -f 'backend/tsconfig.json' ]"
run_test "Frontend TypeScript config" "[ -f 'portal/tsconfig.json' ]"
run_test "Package.json files exist" "[ -f 'backend/package.json' ] && [ -f 'portal/package.json' ]"

# 7. Compilation Tests
echo -e "\n${BLUE}=== Compilation Tests ===${NC}"
cd backend
run_test "Backend TypeScript compilation" "npm run build > /dev/null 2>&1"
cd ../portal
run_test "Frontend TypeScript compilation" "npm run build > /dev/null 2>&1"
cd ..

# 8. Network Connectivity Tests
echo -e "\n${BLUE}=== Network Connectivity Tests ===${NC}"
run_test "Internet connectivity" "ping -c 1 google.com > /dev/null 2>&1"
run_test "DNS resolution" "nslookup google.com > /dev/null 2>&1"

# 9. Advanced API Tests (if backend is running)
if check_endpoint "http://localhost:3001/api/health"; then
    echo -e "\n${BLUE}=== Advanced API Tests ===${NC}"
    
    # Test challenge generation with POST
    run_test "POST Challenge Generation" "curl -s -X POST -H 'Content-Type: application/json' -d '{\"employeeId\":\"EMP001\"}' http://localhost:3001/api/auth/challenge | grep -q challengeId"
    
    # Test CORS headers
    run_test "CORS Headers" "curl -s -H 'Origin: http://localhost:5173' -I http://localhost:3001/api/health | grep -q 'Access-Control-Allow-Origin'"
    
    # Test JSON content type
    run_test "JSON Content Type" "curl -s -I http://localhost:3001/api/health | grep -q 'application/json'"
fi

# 10. Mobile Compatibility Tests
echo -e "\n${BLUE}=== Mobile Compatibility Tests ===${NC}"
run_test "Mobile network access test" "check_endpoint 'http://$LOCAL_IP:3001/api/health'"
run_test "Mobile CORS test" "curl -s -H 'Origin: http://$LOCAL_IP:5173' -I http://$LOCAL_IP:3001/api/health | grep -q 'Access-Control-Allow-Origin'"

# 11. Security Tests
echo -e "\n${BLUE}=== Security Tests ===${NC}"
run_test "HTTPS redirect disabled (dev)" "! curl -s -I http://localhost:3001/api/health | grep -q 'Strict-Transport-Security'"
run_test "Environment files not in public" "! [ -f 'portal/public/.env' ]"

# Summary
echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "=============================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (TESTS_PASSED * 100) / TOTAL_TESTS ))
    echo -e "Success Rate: $SUCCESS_RATE%"
    
    if [ $SUCCESS_RATE -ge 90 ]; then
        echo -e "${GREEN}🎉 Excellent! Platform is ready for use.${NC}"
    elif [ $SUCCESS_RATE -ge 75 ]; then
        echo -e "${YELLOW}⚠️  Good, but some issues need attention.${NC}"
    else
        echo -e "${RED}❌ Platform needs significant fixes before use.${NC}"
    fi
else
    echo -e "${RED}❌ No tests were run.${NC}"
fi

# Recommendations
echo ""
echo -e "${BLUE}=== Recommendations ===${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo "To fix failed tests:"
    echo "1. Ensure backend and frontend are running"
    echo "2. Check network connectivity"
    echo "3. Verify environment files are properly configured"
    echo "4. Run 'npm install' in both backend and portal directories"
    echo "5. Check firewall and antivirus settings"
fi

echo ""
echo -e "${BLUE}=== Quick Start Commands ===${NC}"
echo "Backend: cd backend && npm run dev"
echo "Frontend: cd portal && npm run dev"
echo "Full Platform: ./start-platform.sh (Linux/Mac) or start-platform.bat (Windows)"
echo ""
echo -e "${BLUE}=== Access URLs ===${NC}"
echo "Portal: http://localhost:5173"
echo "API: http://localhost:3001/api/health"
echo "Network Access: http://$LOCAL_IP:3001 and http://$LOCAL_IP:5173"
echo "Wallet: http://localhost:5173/secure-wallet-local.html"

exit $TESTS_FAILED