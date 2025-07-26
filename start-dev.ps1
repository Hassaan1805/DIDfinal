#!/usr/bin/env powershell

# Decentralized Trust Platform - Development Startup Script
# This script ensures proper development environment setup

Write-Host "🚀 Starting Decentralized Trust Platform Development Environment" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $false
    }
    catch {
        return $true
    }
}

# Function to kill process on port
function Stop-ProcessOnPort {
    param([int]$Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
               Select-Object -ExpandProperty OwningProcess -First 1
    if ($process) {
        Write-Host "⚠️  Stopping existing process on port $Port" -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Check required ports
$BackendPort = 3001
$PortalPort = 5174

Write-Host "🔍 Checking ports..." -ForegroundColor Blue

if (Test-Port -Port $BackendPort) {
    Write-Host "⚠️  Port $BackendPort is already in use" -ForegroundColor Yellow
    $response = Read-Host "Do you want to stop the existing process? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Stop-ProcessOnPort -Port $BackendPort
    } else {
        Write-Host "❌ Cannot start backend. Port $BackendPort is occupied." -ForegroundColor Red
        exit 1
    }
}

if (Test-Port -Port $PortalPort) {
    Write-Host "⚠️  Port $PortalPort is already in use" -ForegroundColor Yellow
    $response = Read-Host "Do you want to stop the existing process? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Stop-ProcessOnPort -Port $PortalPort
    } else {
        Write-Host "⚠️  Portal will use next available port" -ForegroundColor Yellow
    }
}

# Check if we're in the right directory
if (-not (Test-Path "backend\package.json") -or -not (Test-Path "portal\package.json")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    Write-Host "   Expected structure:" -ForegroundColor Red
    Write-Host "   - backend/package.json" -ForegroundColor Red
    Write-Host "   - portal/package.json" -ForegroundColor Red
    exit 1
}

# Check if dependencies are installed
Write-Host "📦 Checking dependencies..." -ForegroundColor Blue

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "⚠️  Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "portal\node_modules")) {
    Write-Host "⚠️  Portal dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location portal
    npm install
    Set-Location ..
}

# Check Vite configuration
$viteConfigPath = "portal\vite.config.ts"
if (Test-Path $viteConfigPath) {
    $viteConfig = Get-Content $viteConfigPath -Raw
    if ($viteConfig -notmatch "proxy.*\/api.*3001") {
        Write-Host "⚠️  Vite proxy configuration missing or incorrect" -ForegroundColor Yellow
        Write-Host "   Please ensure vite.config.ts has proxy configuration for /api -> localhost:3001" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Vite proxy configuration found" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Vite configuration file not found" -ForegroundColor Red
}

# Start backend
Write-Host "🔧 Starting backend server..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Blue
Start-Sleep -Seconds 5

# Test backend health
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/health" -TimeoutSec 5
    Write-Host "✅ Backend health check passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend health check failed, but continuing..." -ForegroundColor Yellow
}

# Start portal
Write-Host "🌐 Starting portal..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd portal; npm run dev" -WindowStyle Normal

# Wait for portal to start
Start-Sleep -Seconds 3

Write-Host "🎉 Development environment started!" -ForegroundColor Green
Write-Host "📍 Backend: http://localhost:$BackendPort" -ForegroundColor Cyan
Write-Host "📍 Portal: http://localhost:$PortalPort (or next available)" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Check backend logs for API requests" -ForegroundColor White
Write-Host "   - Check browser console for client-side errors" -ForegroundColor White
Write-Host "   - Use relative URLs (/api/...) in frontend code" -ForegroundColor White
Write-Host "   - Vite proxy handles CORS automatically" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
Write-Host "   - If QR code doesn't load, check Network tab for failed requests" -ForegroundColor White
Write-Host "   - If CORS errors appear, restart both servers" -ForegroundColor White
Write-Host "   - Use 'Get-Process | Where-Object {$_.ProcessName -eq 'node'}' to check running processes" -ForegroundColor White

Write-Host "" -ForegroundColor White
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
