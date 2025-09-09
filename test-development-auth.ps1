# Test Development Mode Authentication for All Employees
# This script tests the development mode authentication bypass

Write-Host "🔧 Testing Development Mode Authentication for All Employees" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green

# Employee test data
$employees = @(
    @{ id = "EMP001"; name = "Zaid"; address = "0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F" },
    @{ id = "EMP002"; name = "Hassaan"; address = "0x1234567890123456789012345678901234567890" },
    @{ id = "EMP003"; name = "Atharva"; address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12" },
    @{ id = "EMP004"; name = "Gracian"; address = "0x9876543210987654321098765432109876543210" }
)

foreach ($employee in $employees) {
    Write-Host ""
    Write-Host "🔐 Testing authentication for $($employee.name) ($($employee.id))" -ForegroundColor Yellow
    
    try {
        # Step 1: Generate challenge
        Write-Host "  ↳ Generating challenge..." -ForegroundColor Gray
        $challengeResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/challenge" -Method POST
        $challengeData = $challengeResponse.data
        $challengeId = $challengeData.challengeId
        $challenge = $challengeData.challenge
        $message = "Sign this message to authenticate with challenge: $challenge"
        
        Write-Host "  ↳ Challenge ID: $challengeId" -ForegroundColor Gray
        
        # Step 2: Verify with demo signature (development mode)
        Write-Host "  ↳ Verifying with demo signature..." -ForegroundColor Gray
        $verifyData = @{
            challengeId = $challengeId
            signature = "demo_signature_for_development"
            address = $employee.address
            message = $message
        }
        
        $verifyResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/verify" -Method POST -Body ($verifyData | ConvertTo-Json) -ContentType "application/json"
        
        if ($verifyResponse.success) {
            Write-Host "  ✅ SUCCESS: $($employee.name) authenticated successfully!" -ForegroundColor Green
            Write-Host "  ↳ JWT Token received (length: $($verifyResponse.data.token.Length))" -ForegroundColor Green
        } else {
            Write-Host "  ❌ FAILED: $($verifyResponse.error)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Development mode authentication test completed!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
