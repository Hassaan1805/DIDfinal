#!/usr/bin/env pwsh
# =============================================================================
# DID Platform - Automatic IP Configuration Script
# Updates ALL hardcoded IPs across the entire project in one shot
# Run this whenever you switch WiFi networks or move to a new machine
# =============================================================================

$ProjectRoot = $PSScriptRoot

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  DID Platform - Auto IP Setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------------
# Step 1: Detect local IP
# -----------------------------------------------------------------------------
$DetectedIP = $null

# Try to get WiFi / Ethernet IPv4 (prefer non-loopback, non-virtual)
$adapters = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.InterfaceAlias -notmatch 'Loopback|Bluetooth|VMware|VirtualBox|Hyper-V|vEthernet|WSL' -and
        $_.IPAddress -notmatch '^127\.' -and
        $_.IPAddress -notmatch '^169\.254\.'  # APIPA
    } |
    Sort-Object -Property PrefixLength -Descending

if ($adapters) {
    $DetectedIP = $adapters[0].IPAddress
}

# Fallback: parse ipconfig
if (-not $DetectedIP) {
    $ipconfigOut = ipconfig | Select-String 'IPv4'
    foreach ($line in $ipconfigOut) {
        $ip = ($line -split ':')[-1].Trim()
        if ($ip -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' -and $ip -ne '127.0.0.1') {
            $DetectedIP = $ip
            break
        }
    }
}

if (-not $DetectedIP) {
    Write-Host "ERROR: Could not detect IP address automatically." -ForegroundColor Red
    $DetectedIP = Read-Host "Enter your IP address manually"
}

Write-Host "Detected IP: " -NoNewline
Write-Host $DetectedIP -ForegroundColor Green
Write-Host ""

# Ask user to confirm or override
$Override = Read-Host "Press Enter to use this IP, or type a different IP"
if ($Override.Trim() -ne '') {
    $DetectedIP = $Override.Trim()
    Write-Host "Using IP: $DetectedIP" -ForegroundColor Yellow
}

$IP = $DetectedIP
Write-Host ""

# -----------------------------------------------------------------------------
# Step 2: Define all files + replacements
# -----------------------------------------------------------------------------
$Files = @(
    @{
        Path        = "portal\.env.local"
        Description = "Portal env.local (Vite BACKEND_URL)"
        Replacements = @(
            @{ Pattern = 'VITE_BACKEND_URL=http://[^:\s]+:3001'; Value = "VITE_BACKEND_URL=http://$IP`:3001" }
            @{ Pattern = 'VITE_API_BASE_URL=http://[^:\s]+:3001/api'; Value = "VITE_API_BASE_URL=http://$IP`:3001/api" }
        )
        EnsureLines = @(
            @{ Key = 'VITE_API_BASE_URL'; Value = 'VITE_API_BASE_URL=/api' }
            @{ Key = 'VITE_BACKEND_URL';  Value = "VITE_BACKEND_URL=http://$IP`:3001" }
            @{ Key = 'VITE_NODE_ENV';     Value = 'VITE_NODE_ENV=development' }
        )
    },
    @{
        Path        = "portal\.env.development"
        Description = "Portal env.development"
        Replacements = @(
            @{ Pattern = 'VITE_API_BASE_URL=http://[^:\s]+:3001[^\n]*'; Value = "VITE_API_BASE_URL=http://$IP`:3001/api" }
            @{ Pattern = 'VITE_BACKEND_URL=http://[^:\s]+:3001';        Value = "VITE_BACKEND_URL=http://$IP`:3001" }
            @{ Pattern = 'VITE_BACKEND_URL=http://localhost:3000';       Value = "VITE_BACKEND_URL=http://$IP`:3001" }
        )
    },
    @{
        Path        = "portal\vite.config.ts"
        Description = "Portal Vite proxy target"
        Replacements = @(
            @{ Pattern = "target: 'http://[^']+:3001'"; Value = "target: 'http://$IP`:3001'" }
            @{ Pattern = 'target: "http://[^"]+:3001"'; Value = "target: `"http://$IP`:3001`"" }
        )
    },
    @{
        Path        = "backend\.env.development"
        Description = "Backend env (PRIMARY_HOST_IP)"
        Replacements = @(
            @{ Pattern = 'PRIMARY_HOST_IP=[\d.]+'; Value = "PRIMARY_HOST_IP=$IP" }
            @{ Pattern = 'HOST=(?!0\.0\.0\.0)[\d.]+'; Value = 'HOST=0.0.0.0' }
        )
    },
    @{
        Path        = "wallet\.env"
        Description = "Wallet Expo env"
        Replacements = @(
            @{ Pattern = 'EXPO_PUBLIC_API_URL=http://[^:\s]+:3001'; Value = "EXPO_PUBLIC_API_URL=http://$IP`:3001" }
        )
    }
)

# -----------------------------------------------------------------------------
# Step 3: Apply replacements
# -----------------------------------------------------------------------------
$updated = 0
$skipped = 0

foreach ($file in $Files) {
    $fullPath = Join-Path $ProjectRoot $file.Path

    if (-not (Test-Path $fullPath)) {
        Write-Host "  SKIP (not found): $($file.Path)" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    $content = Get-Content $fullPath -Raw

    $changed = $false
    foreach ($rep in $file.Replacements) {
        $newContent = $content -replace $rep.Pattern, $rep.Value
        if ($newContent -ne $content) {
            $content = $newContent
            $changed = $true
        }
    }

    # For files with EnsureLines: guarantee keys exist even if pattern didn't match
    if ($file.EnsureLines) {
        foreach ($line in $file.EnsureLines) {
            if ($content -notmatch [regex]::Escape($line.Key + '=')) {
                $content = $content.TrimEnd() + "`n$($line.Value)`n"
                $changed = $true
            }
        }
    }

    if ($changed) {
        try {
            Set-Content $fullPath $content -NoNewline -ErrorAction Stop
            Write-Host "  UPDATED: $($file.Path)" -ForegroundColor Green
            $updated++
        } catch {
            # File locked (e.g. Vite has vite.config.ts open) — write via temp file
            try {
                $tmp = "$fullPath.tmp"
                Set-Content $tmp $content -NoNewline
                Move-Item $tmp $fullPath -Force
                Write-Host "  UPDATED: $($file.Path)" -ForegroundColor Green
                $updated++
            } catch {
                Write-Host "  WARN:    $($file.Path) is locked — restart the service after setup" -ForegroundColor Yellow
                $skipped++
            }
        }
    } else {
        Write-Host "  OK:      $($file.Path) (no change needed)" -ForegroundColor DarkGray
        $skipped++
    }
}

# -----------------------------------------------------------------------------
# Step 4: Also update wallet/.env with full block (guaranteed correct)
# -----------------------------------------------------------------------------
$walletEnvPath = Join-Path $ProjectRoot "wallet\.env"
$walletEnvContent = @"
# Backend Configuration - Auto-updated $(Get-Date -Format 'yyyy-MM-dd HH:mm')
EXPO_PUBLIC_API_URL=http://$IP`:3001

# Fallback backends
EXPO_PUBLIC_API_URL_FALLBACK_1=http://localhost:3001
EXPO_PUBLIC_API_URL_FALLBACK_2=https://did-platform-backend.railway.app

# Network Configuration
EXPO_PUBLIC_NETWORK_TIMEOUT=10000
EXPO_PUBLIC_AUTO_DISCOVER=true

# Blockchain
EXPO_PUBLIC_CHAIN_ID=11155111
EXPO_PUBLIC_NETWORK=sepolia
"@
Set-Content $walletEnvPath $walletEnvContent
Write-Host "  WRITTEN: wallet\.env" -ForegroundColor Green

# -----------------------------------------------------------------------------
# Step 5: Summary
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Done! IP set to: $IP" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart backend:  cd backend && npm run dev"
Write-Host "  2. Restart portal:   cd portal && npm run dev"
Write-Host "  3. Restart wallet:   cd wallet && npx expo start --clear"
Write-Host ""
Write-Host "Or just run:  .\start-all.bat" -ForegroundColor Cyan
Write-Host ""
