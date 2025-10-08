# 🚀 Quick Start - Railway Deployment

## Ready to Deploy? Follow These Steps!

### 1️⃣ **Install Railway CLI**
```bash
npm install -g @railway/cli
```

### 2️⃣ **Deploy Your Platform**

**On Windows:**
```bash
.\deploy-railway.bat
```

**On Linux/macOS:**
```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

### 3️⃣ **Build Mobile App**

**On Windows:**
```bash
.\build-mobile-production.bat
```

**On Linux/macOS:**
```bash
chmod +x build-mobile-production.sh
./build-mobile-production.sh
```

### 4️⃣ **Test Everything**

1. **Backend**: Visit `https://your-backend.railway.app/api/health`
2. **Portal**: Visit `https://your-portal.railway.app`
3. **Mobile**: Install APK and test authentication

---

## 📋 What You'll Get

- ✅ **Live Backend API** on Railway
- ✅ **Web Portal** accessible anywhere
- ✅ **Mobile APK** that works with your deployment
- ✅ **Blockchain Integration** on Sepolia testnet
- ✅ **QR Code Authentication** between portal and mobile

## 🔧 Troubleshooting

- **Railway CLI issues**: Run `railway login` first
- **Build errors**: Check [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)
- **Mobile connection**: Verify backend URL in app settings

## 🎯 Next Steps

1. Deploy with the scripts above
2. Test the QR authentication flow
3. Share the mobile APK with your team
4. Configure custom domains if needed

**Need help?** Check the detailed [Railway Deployment Guide](./RAILWAY_DEPLOYMENT_GUIDE.md)!