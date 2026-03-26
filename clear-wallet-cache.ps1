Write-Host "=== Clearing Wallet Cache ===" -ForegroundColor Cyan
Write-Host ""

# Clear node_modules cache
if (Test-Path "node_modules\.cache") {
    Remove-Item -Path "node_modules\.cache" -Recurse -Force
    Write-Host "✓ Cleared node_modules\.cache" -ForegroundColor Green
} else {
    Write-Host "✓ No node_modules\.cache found (already clean)" -ForegroundColor Yellow
}

# Clear .expo directory
if (Test-Path ".expo") {
    Remove-Item -Path ".expo" -Recurse -Force
    Write-Host "✓ Cleared .expo directory" -ForegroundColor Green
} else {
    Write-Host "✓ No .expo directory found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Cache Cleared Successfully ===" -ForegroundColor Green
Write-Host ""
Write-Host "Now starting wallet with --clear flag..." -ForegroundColor Cyan
Write-Host ""

# Start wallet with clear flag
npm start -- --clear
