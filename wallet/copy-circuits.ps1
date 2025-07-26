# PowerShell script to copy compiled circuit files from circuits build to wallet assets

Write-Host "Copying circuit files to wallet assets..." -ForegroundColor Yellow

# Create assets directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "src\assets\circuits\" | Out-Null

# Copy WASM file
$wasmPath = "..\circuits\build\nftOwnership.wasm"
if (Test-Path $wasmPath) {
    Copy-Item $wasmPath "src\assets\circuits\"
    Write-Host "✅ Copied nftOwnership.wasm" -ForegroundColor Green
} else {
    Write-Host "❌ nftOwnership.wasm not found. Run 'npm run compile' in circuits directory first." -ForegroundColor Red
}

# Copy proving key
$zkeyPath = "..\circuits\nftOwnership_0001.zkey"
if (Test-Path $zkeyPath) {
    Copy-Item $zkeyPath "src\assets\circuits\nftOwnership_final.zkey"
    Write-Host "✅ Copied nftOwnership_final.zkey" -ForegroundColor Green
} else {
    Write-Host "❌ nftOwnership_0001.zkey not found. Run 'npm run ceremony' in circuits directory first." -ForegroundColor Red
}

Write-Host "`nCircuit files copy complete!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Compile circuits: cd ..\circuits; npm run compile"
Write-Host "2. Run ceremony: cd ..\circuits; npm run ceremony" 
Write-Host "3. Copy files: .\copy-circuits.ps1"
Write-Host "4. Test the app: npm start"
