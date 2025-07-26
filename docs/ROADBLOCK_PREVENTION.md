# 🚫 Preventing Development Roadblocks

This document outlines the preventive measures implemented to avoid common development issues in the Decentralized Trust Platform.

## 🎯 Quick Start (No More Roadblocks)

```powershell
# 1. Run the automated startup script
.\start-dev.ps1

# 2. Or manually with verification:
cd backend && npm run dev
cd portal && npm run dev

# 3. Verify everything is working:
npm run check-config
```

## 🛡️ Preventive Measures Implemented

### 1. **Standardized Vite Configuration**
- ✅ **File**: `portal/vite.config.ts`
- ✅ **Template**: `portal/vite.config.template.ts`
- ✅ **Purpose**: Prevents CORS issues by automatically proxying API calls

**What it prevents:**
- Cross-origin request failures
- Manual CORS configuration
- Port mismatch issues

### 2. **API Utility Layer**
- ✅ **File**: `portal/src/utils/api.ts`
- ✅ **Purpose**: Enforces proper API communication patterns

**What it prevents:**
- Inconsistent fetch implementations
- Missing error handling
- Hardcoded URLs
- Retry logic omission

### 3. **Environment Configuration**
- ✅ **Files**: 
  - `backend/.env.development`
  - `portal/.env.development`
- ✅ **Purpose**: Standardizes development settings

**What it prevents:**
- Configuration drift
- Port conflicts
- Missing environment variables
- Inconsistent development setup

### 4. **Automated Startup Script**
- ✅ **File**: `start-dev.ps1`
- ✅ **Purpose**: Ensures proper startup sequence

**What it prevents:**
- Wrong startup order
- Port conflicts
- Missing dependency checks
- Manual configuration errors

### 5. **Configuration Validator**
- ✅ **File**: `scripts/validate-config.ts`
- ✅ **Purpose**: Validates development setup

**What it prevents:**
- Misconfigured proxy
- Missing dependencies
- Invalid configuration files
- Silent configuration errors

## 🔧 How to Use Preventive Measures

### Before Starting Development:
```powershell
# Check configuration
npm run check-config

# Start with validation
.\start-dev.ps1
```

### When Adding New API Endpoints:
```typescript
// ✅ Use the API utility
import { AuthAPI } from '../utils/api';

const data = await AuthAPI.getChallenge();

// ❌ Don't use raw fetch with absolute URLs
const response = await fetch('http://localhost:3001/api/auth/challenge');
```

### When Making Frontend Changes:
```typescript
// ✅ Use relative URLs (proxy will handle routing)
fetch('/api/auth/challenge')

// ❌ Don't use absolute URLs
fetch('http://localhost:3001/api/auth/challenge')
```

## 🚨 Common Roadblocks and Solutions

### Problem: QR Code Not Loading
**Symptoms:** 
- Blank QR code area
- Console errors about failed requests
- Network tab shows blocked requests

**Solution:**
1. Check Vite proxy configuration
2. Ensure backend is running on port 3001
3. Use relative URLs in fetch calls
4. Restart Vite dev server

**Prevention:**
- Use `ApiClient` from `utils/api.ts`
- Always use relative URLs
- Run configuration validator

### Problem: CORS Errors
**Symptoms:**
- "Access-Control-Allow-Origin" errors
- Requests blocked by browser
- Cross-origin policy violations

**Solution:**
1. Verify Vite proxy is configured
2. Check backend CORS settings
3. Restart both servers

**Prevention:**
- Use standardized Vite config
- Never bypass proxy in development
- Use provided environment files

### Problem: Port Conflicts
**Symptoms:**
- "Port already in use" errors
- Services failing to start
- Unexpected behavior

**Solution:**
1. Use startup script (handles port conflicts)
2. Kill existing processes
3. Use different ports if needed

**Prevention:**
- Use automated startup script
- Check ports before starting
- Use standard port assignments

### Problem: Missing Dependencies
**Symptoms:**
- Import errors
- Module not found errors
- Build failures

**Solution:**
1. Run `npm install` in both directories
2. Check package.json for missing dependencies
3. Clear node_modules and reinstall

**Prevention:**
- Use startup script (checks dependencies)
- Run configuration validator
- Keep package.json files updated

## 📋 Development Checklist

Before starting any development session:

- [ ] Run `.\start-dev.ps1` OR validate configuration manually
- [ ] Verify backend health at `http://localhost:3001/api/health`
- [ ] Check portal loads at `http://localhost:5174`
- [ ] Test QR code generation works
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls

## 🔄 Continuous Prevention

### Git Hooks (Recommended)
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm run check-config
```

### IDE Configuration
- VSCode: Use workspace settings
- Extensions: ESLint, Prettier, TypeScript
- Auto-format on save

### Team Guidelines
1. Always use provided API utilities
2. Never commit absolute URLs
3. Run startup script for consistency
4. Update documentation when adding features

## 🆘 Emergency Fixes

If you encounter unexpected issues:

```powershell
# 1. Full reset
taskkill /f /im node.exe
cd backend && npm install && npm run dev
cd portal && npm install && npm run dev

# 2. Configuration check
npm run check-config

# 3. Clear everything and restart
Remove-Item -Recurse -Force backend\node_modules, portal\node_modules
cd backend && npm install
cd portal && npm install
.\start-dev.ps1
```

## 📚 Additional Resources

- [Development Setup Guide](./DEVELOPMENT_SETUP.md)
- [API Documentation](../docs/API.md)
- [Troubleshooting Guide](../docs/TROUBLESHOOTING.md)

---

**Remember:** Prevention is better than debugging! 🛡️
