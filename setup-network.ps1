# ========================================
# DIDfinal Network Configuration Script (Windows)
# Automatically updates IP addresses across the project
# ========================================

param(
    [Parameter(Mandatory=$true)]
    [string]$NewIP
)

$OldIP = "192.168.1.100"

Write-Host "======================================" -ForegroundColor Green
Write-Host "DIDfinal Network Configuration" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

Write-Host "Old IP: " -NoNewline -ForegroundColor Yellow
Write-Host $OldIP
Write-Host "New IP: " -NoNewline -ForegroundColor Yellow
Write-Host $NewIP
Write-Host ""

# Validate IP format
if ($NewIP -notmatch '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
    Write-Host "Error: Invalid IP address format" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Creating environment files..." -ForegroundColor Green

# Backend environment
@"
LOCAL_IP=$NewIP
PORT=3001
ETHEREUM_RPC_URL=http://127.0.0.1:8545
DID_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
GAS_STATION_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
JWT_SECRET=your-secure-jwt-secret-key
COMPANY_DID=did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8
NODE_ENV=development
DEMO_MODE=true
"@ | Out-File -FilePath "backend\.env.development" -Encoding UTF8

Write-Host "✅ Created backend\.env.development"

# Portal environment
@"
VITE_API_BASE_URL=http://${NewIP}:3001/api
VITE_CERTIFICATE_API_URL=http://127.0.0.1:5000
VITE_FRONTEND_URL=http://localhost:5173
VITE_NODE_ENV=development
"@ | Out-File -FilePath "portal\.env" -Encoding UTF8

Write-Host "✅ Created portal\.env"

# Certificate backend environment
@"
DB_USER=root
DB_PASSWORD=tiger
DB_HOST=localhost
DB_NAME=certificate_auth
DB_PORT=3306
PORT=5000
DEBUG=True
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:5173,http://${NewIP}:3001,http://127.0.0.1:5500
OUTPUT_DIR=certificates
PROOF_DIR=zk_proofs
"@ | Out-File -FilePath "certificate_backend\.env" -Encoding UTF8

Write-Host "✅ Created certificate_backend\.env"

Write-Host ""
Write-Host "Step 2: Updating hardcoded IPs in source files..." -ForegroundColor Green

# Function to replace IP in file
function Replace-IP {
    param($FilePath)
    if (Test-Path $FilePath) {
        (Get-Content $FilePath) -replace [regex]::Escape($OldIP), $NewIP | Set-Content $FilePath
        Write-Host "✅ Updated $FilePath"
        return $true
    }
    return $false
}

# Update files
Replace-IP "backend\src\app.ts"
Replace-IP "backend\src\routes\auth.ts"
Replace-IP "portal\src\EnterprisePortalProfessional.tsx"
Replace-IP "portal\src\utils\api.ts"
Replace-IP "portal\src\pages\LoginPage.tsx"
Replace-IP "portal\vite.config.ts"

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "Configuration Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Summary:"
Write-Host "   New IP address: $NewIP"
Write-Host "   Files updated: 9"
Write-Host ""
Write-Host "🔧 Next steps:"
Write-Host "   1. Rebuild backend: cd backend; npm run build"
Write-Host "   2. Restart backend: npm start"
Write-Host "   3. Restart portal: cd portal; npm run dev"
Write-Host "   4. Restart certificate backend: cd certificate_backend; python auth.py"
Write-Host ""
Write-Host "📱 Mobile App:"
Write-Host "   Update API URL in mobile_wallet\lib\config.dart to: http://${NewIP}:3001/api"
Write-Host ""
Write-Host "Done! Your project is now configured for IP: $NewIP" -ForegroundColor Green
