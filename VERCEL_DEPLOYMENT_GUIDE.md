# 🚀 Vercel Deployment Guide
## Portal Deployment for Decentralized Trust Platform

This guide will help you deploy the portal to Vercel and connect it to your existing Railway backend.

## 📋 Current Setup

✅ **Backend**: https://did-platform-backend-production.up.railway.app/  
⏳ **Portal**: Ready to deploy to Vercel  
⏳ **Mobile App**: Ready to build with live URLs

## 🎯 Quick Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: Visit [vercel.com](https://vercel.com) and sign in
2. **Import Project**: Click "New Project" → "Import Git Repository"
3. **Connect GitHub**: Connect your GitHub account if not already connected
4. **Select Repository**: Choose `Hassaan1805/DIDfinal`
5. **Configure Project**:
   - **Project Name**: `did-platform-portal`
   - **Framework Preset**: `Vite`
   - **Root Directory**: `portal`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. **Environment Variables**: Add these in Vercel dashboard:
   ```
   NODE_ENV=production
   VITE_API_BASE_URL=https://did-platform-backend-production.up.railway.app/api
   VITE_BACKEND_URL=https://did-platform-backend-production.up.railway.app
   VITE_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
   VITE_DEMO_MODE=true
   ```

7. **Deploy**: Click "Deploy" and wait for completion

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to portal directory
cd "e:\projects\Random Projects\DIDfinal\portal"

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: did-platform-portal
# - Directory: ./
# - Override settings? No
```

## 🔧 Configuration Files

The project already includes:

### ✅ `vercel.json`
- Pre-configured for Vite build
- Environment variables set
- SPA routing configured

### ✅ `package.json`
- Build scripts ready
- Node.js engine specified
- All dependencies listed

## 🌐 Expected URLs After Deployment

- **Portal**: `https://did-platform-portal.vercel.app` (or your custom domain)
- **Backend**: `https://did-platform-backend-production.up.railway.app` (already live)
- **Health Check**: `https://did-platform-backend-production.up.railway.app/api/health`

## 🧪 Testing the Deployment

### 1. Backend Health Check
```bash
curl https://did-platform-backend-production.up.railway.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Decentralized Trust Platform API is running",
  "timestamp": "2025-10-08T..."
}
```

### 2. Portal Testing
1. Open your Vercel portal URL
2. Check browser console for any errors
3. Navigate to "Blockchain" tab to test API connectivity
4. Try the authentication flow

### 3. CORS Verification
The backend is already configured to accept requests from:
- `*.vercel.app` domains
- `*.railway.app` domains
- Production domains

## 📱 Mobile App Update

After portal deployment, update your mobile app:

1. **Update network service**: Add your Vercel URL to the mobile app's network configuration
2. **Build new APK**: Use the build script with live URLs
3. **Test end-to-end**: Verify QR code authentication between mobile and portal

## 🚀 Deployment Checklist

- [ ] Vercel project created and configured
- [ ] Environment variables set correctly
- [ ] Portal deployed successfully
- [ ] Backend connectivity verified
- [ ] Authentication flow tested
- [ ] Mobile app configured with live URLs
- [ ] End-to-end testing completed

## 🛠️ Troubleshooting

### Common Issues

1. **Build Errors**:
   - Check if all environment variables are set
   - Verify Node.js version compatibility
   - Check build logs in Vercel dashboard

2. **API Connection Issues**:
   - Verify backend URL is correct
   - Check CORS configuration
   - Test backend endpoints directly

3. **Environment Variables**:
   - Ensure all VITE_ prefixed variables are set
   - Check if variables are available during build

### Useful Commands

```bash
# Check Vercel deployment status
vercel list

# View deployment logs
vercel logs [deployment-url]

# Check environment variables
vercel env ls

# Redeploy
vercel --prod
```

## 🎯 Next Steps

1. **Deploy to Vercel** following the steps above
2. **Test the portal** to ensure API connectivity
3. **Update mobile app** with live portal URL
4. **Build production APK** for testing
5. **Celebrate!** 🎉 Your DID platform is live

## 📞 Support

If you encounter issues:
1. Check Vercel build logs
2. Verify environment variables
3. Test backend endpoints directly
4. Check browser console for errors

Your platform will be fully operational once the portal is deployed to Vercel! 🚀