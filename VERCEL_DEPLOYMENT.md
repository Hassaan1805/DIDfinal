# 🚀 Vercel Deployment Guide
## Deploy Portal to Vercel (Connected to Railway Backend)

Your Railway backend is already running at: `https://did-platform-backend-production.up.railway.app/`

Now let's deploy the portal to Vercel and connect it to your Railway backend.

## 📋 Quick Start (Option A: Vercel CLI)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy Portal
```bash
cd portal
vercel login
vercel --prod
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your personal account
- **Link to existing project?** → No
- **Project name?** → `did-platform-portal`
- **Directory?** → `./` (current directory)
- **Override settings?** → No

## 🌐 Option B: Vercel Web Dashboard

### 1. Go to Vercel Dashboard
- Visit [vercel.com](https://vercel.com)
- Sign in with GitHub

### 2. Import Project
- Click "New Project"
- Import your GitHub repository: `Hassaan1805/DIDfinal`
- Select the **portal** directory as the root

### 3. Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `portal`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 4. Environment Variables
Add these in Vercel dashboard:
```
NODE_ENV=production
VITE_API_BASE_URL=https://did-platform-backend-production.up.railway.app/api
VITE_BACKEND_URL=https://did-platform-backend-production.up.railway.app
VITE_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
VITE_DEMO_MODE=true
```

### 5. Deploy
- Click "Deploy"
- Wait for deployment to complete

## ✅ After Deployment

### Your URLs will be:
- **Portal**: `https://did-platform-portal.vercel.app` (or custom domain)
- **Backend**: `https://did-platform-backend-production.up.railway.app/`

### Test the Connection
1. Open your Vercel portal URL
2. Check browser console for API connection
3. Test login/authentication flow
4. Verify blockchain viewer works

## 🔧 Backend CORS Configuration

Your Railway backend needs to allow your Vercel domain. Add this to your backend's CORS configuration:

```javascript
// In backend/src/app.ts or wherever CORS is configured
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-vercel-domain.vercel.app', // Add your actual Vercel URL
    'https://did-platform-portal.vercel.app' // If this is your domain
  ],
  credentials: true
};
```

## 📱 Update Mobile App

Once your portal is deployed, update the mobile app with the new URLs:

```dart
// In mobile_wallet/lib/services/network_service.dart
final List<String> _baseUrls = [
  'https://did-platform-backend-production.up.railway.app', // Backend
  'https://your-portal.vercel.app', // Portal (for QR codes)
  // ... other URLs
];
```

## 🎯 Benefits of This Setup

✅ **Railway Backend**: Node.js/Express with database connections
✅ **Vercel Portal**: Fast React deployment with global CDN
✅ **No 403 Errors**: Vercel handles React builds perfectly
✅ **Automatic Deployments**: Updates on every git push
✅ **HTTPS**: Both services provide SSL certificates
✅ **Custom Domains**: Easy to configure on both platforms

## 🔍 Troubleshooting

### CORS Issues
If you get CORS errors, update the backend CORS configuration with your Vercel URL.

### Environment Variables
Make sure all `VITE_*` variables are set in Vercel dashboard.

### Build Errors
Check Vercel build logs and ensure all dependencies are installed.

## 🚀 Ready to Deploy?

Run this command in your portal directory:
```bash
vercel --prod
```

Your Decentralized Trust Platform will be live with:
- **Backend**: Railway (database + APIs)
- **Portal**: Vercel (fast global CDN)
- **Mobile**: Updated to connect to both services