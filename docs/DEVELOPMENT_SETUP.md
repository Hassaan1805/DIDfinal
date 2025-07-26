# Development Setup Guide

## Overview
This guide ensures proper setup to avoid common development roadblocks in our Decentralized Trust Platform.

## Common Issues and Solutions

### 1. CORS and Cross-Origin Request Issues

**Problem:** React frontend cannot make requests to backend API due to CORS restrictions.

**Solution:** Always use Vite proxy configuration for development.

**Required Configuration:**
```typescript
// portal/vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

**Frontend API Calls:**
- ✅ Use relative paths: `fetch('/api/auth/challenge')`
- ❌ Avoid absolute URLs: `fetch('http://localhost:3001/api/auth/challenge')`

### 2. Port Management

**Standard Port Assignment:**
- Backend API: `3001`
- React Portal: `5174` (or next available)
- React Native Metro: `8081`

**Environment Variables:**
```bash
# backend/.env
PORT=3001
NODE_ENV=development

# portal/.env
VITE_API_URL=/api
```

### 3. Development Workflow

**Startup Order:**
1. Start backend: `cd backend && npm run dev`
2. Start portal: `cd portal && npm run dev`
3. Verify proxy is working by checking network requests

**Verification Checklist:**
- [ ] Backend shows startup message with port
- [ ] Portal shows Vite ready message
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows API requests going to relative URLs

## Quick Setup Commands

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Portal  
cd portal
npm run dev

# Terminal 3 - Mobile (when needed)
cd wallet
npx react-native start
```

## Troubleshooting

### If QR Code doesn't load:
1. Check browser console for CORS errors
2. Verify backend is running on port 3001
3. Ensure Vite proxy is configured
4. Check network tab for failed requests

### If backend requests aren't reaching:
1. Restart Vite dev server after proxy config changes
2. Clear browser cache
3. Check if backend is actually running
4. Verify fetch URLs use relative paths

## Prevention Checklist

Before starting development:
- [ ] Vite proxy configured
- [ ] Environment variables set
- [ ] Both servers can start without errors
- [ ] API endpoints use relative URLs
- [ ] CORS headers configured on backend

## Emergency Quick Fix

If you encounter CORS issues:
1. Add proxy to `vite.config.ts`
2. Change all fetch URLs to relative paths
3. Restart Vite dev server
4. Clear browser cache

This should resolve 99% of cross-origin request issues.
