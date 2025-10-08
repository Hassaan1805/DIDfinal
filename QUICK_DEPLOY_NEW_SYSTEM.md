# 🚀 Quick Deployment Guide

Deploy the DID Platform on any new system in 3 steps:

## 🎯 Quick Start (5 Minutes)

### Windows
```cmd
git clone https://github.com/zaidnansari2011/DIDfinal.git
cd DIDfinal
git checkout blockchain-implementation
setup-new-system.bat
```

### Linux/macOS  
```bash
git clone https://github.com/zaidnansari2011/DIDfinal.git
cd DIDfinal
git checkout blockchain-implementation
chmod +x setup-new-system.sh
./setup-new-system.sh
```

## ✅ What This Does

1. **Auto-detects** your system's IP address
2. **Installs** all Node.js dependencies  
3. **Configures** environment files for your network
4. **Sets up** firewall rules (if permissions allow)
5. **Creates** startup scripts
6. **Tests** the deployment

## 🌐 Network Access

After setup:
- **Backend**: `http://YOUR_IP:3001/api/health`
- **Frontend**: `http://YOUR_IP:5173`  
- **Mobile**: Install APK, connects to `YOUR_IP:3001`

## 📱 Mobile Setup

1. Transfer `app-release.apk` to Android device
2. Install APK (enable "Unknown sources")
3. Ensure device on same WiFi network
4. App auto-discovers backend

## 🧪 Testing

```bash
# Test everything works
./test-platform.sh        # Linux/macOS
test-platform.bat         # Windows

# Manual tests
curl http://YOUR_IP:3001/api/health
curl http://YOUR_IP:5173
```

## 🔧 Troubleshooting

**Can't connect from mobile?**
- Check firewall settings
- Verify same WiFi network
- Test with: `curl http://YOUR_IP:3001/api/health`

**Dependencies fail?**
- Ensure Node.js 18+ installed
- Run `npm install` manually in backend/ and portal/

**Port conflicts?**
- Check ports 3001 and 5173 are free
- Use `netstat -an | grep :3001`

---

For detailed documentation, see [DEPLOYMENT_ON_NEW_SYSTEM.md](DEPLOYMENT_ON_NEW_SYSTEM.md)