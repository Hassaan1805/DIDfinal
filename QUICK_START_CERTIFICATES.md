# 🚀 Quick Start Guide - Certificate Authenticator

## Prerequisites Check

Before starting, ensure you have:
- ✅ Python 3.8+ installed
- ✅ Node.js 18+ installed
- ✅ MySQL 8.0+ installed and running
- ✅ Git installed

## Step-by-Step Setup

### 1. Install Python Dependencies

```powershell
# Navigate to certificate backend
cd "e:\projects\Random Projects\DIDfinal\certificate_backend"

# Install all Python packages
pip install -r requirements.txt
```

### 2. Install Tesseract OCR

**Windows:**
1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to default location (usually `C:\Program Files\Tesseract-OCR\`)
3. Add to PATH environment variable:
   - Right-click "This PC" → Properties
   - Advanced system settings → Environment Variables
   - Edit "Path" → Add `C:\Program Files\Tesseract-OCR\`
4. Restart your terminal

**Verify installation:**
```powershell
tesseract --version
```

### 3. Setup MySQL Database

**Option A: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to your MySQL server
3. Run this SQL:

```sql
CREATE DATABASE certificate_auth;

USE certificate_auth;

CREATE TABLE certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    completion_date DATE NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Option B: Using Command Line**
```powershell
# Login to MySQL
mysql -u root -p

# Run the SQL commands above
```

### 4. Configure Database Connection

Edit `certificate_backend/auth.py` and update these lines (around line 12):

```python
db_config = {
    'user': 'root',              # Your MySQL username
    'password': 'your_password',  # Your MySQL password
    'host': 'localhost',
    'database': 'certificate_auth'
}
```

### 5. Start the Certificate Backend

```powershell
# Make sure you're in certificate_backend folder
cd "e:\projects\Random Projects\DIDfinal\certificate_backend"

# Start Flask server
python auth.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

**Keep this terminal open!**

### 6. Start the React Portal (New Terminal)

```powershell
# Navigate to portal folder
cd "e:\projects\Random Projects\DIDfinal\portal"

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

You should see:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

**Keep this terminal open too!**

### 7. Access the Certificates Page

1. Open your browser
2. Go to: http://localhost:5173
3. Login with your DID (if authentication is required)
4. Click the **"Certificates"** tab in the navigation
5. OR directly visit: http://localhost:5173/certificates

## Testing the Features

### Test 1: Generate a Certificate

1. Click the **"Generate"** button
2. Fill in all fields:
   - Name: `John Doe`
   - Organization: `Tech Corp`
   - Issue Date: Select today's date
   - Expiry Date: Select a future date
   - Completion Date: Select today's date
   - Issuer: `Jane Smith`
   - Serial Number: `CERT-2025-001`
3. Click **"Generate Certificate"**
4. Download the PDF when it appears

### Test 2: Upload and Verify

1. Click the **"Upload"** button
2. Select issuing authority (try "Other" for testing)
3. Click **"Confirm & Upload"**
4. Select a certificate file (image or PDF)
5. Preview will appear
6. Click **"Authenticate"**
7. View the verification result

### Test 3: Verify Udemy Certificate (if you have one)

1. Click **"Upload"**
2. Select **"Udemy"** from dropdown
3. Upload your Udemy certificate PDF
4. Click **"Authenticate"**
5. System will extract and verify the certificate URL

## Common Issues & Solutions

### Issue 1: "Module not found" error
**Solution:**
```powershell
pip install -r requirements.txt
```

### Issue 2: "Tesseract not found"
**Solution:**
- Verify Tesseract is installed
- Check it's in your PATH
- Restart terminal/computer
- Try: `tesseract --version`

### Issue 3: "Database connection failed"
**Solution:**
- Check MySQL is running
- Verify username and password in `auth.py`
- Ensure database `certificate_auth` exists
- Test connection: `mysql -u root -p`

### Issue 4: "Port 5000 already in use"
**Solution:**
Edit `auth.py`, change last line to:
```python
app.run(debug=True, port=5001)
```
And update `CertificatesPage.tsx` FLASK_API_URL to match.

### Issue 5: CORS errors in browser console
**Solution:**
```powershell
pip install flask-cors
```

Then add to `auth.py` (at the top):
```python
from flask_cors import CORS
# After app = Flask(__name__)
CORS(app)
```

### Issue 6: React page shows blank
**Solution:**
- Check browser console for errors (F12)
- Verify Flask backend is running on port 5000
- Check network tab for failed requests

## Verification Checklist

- [ ] Python 3.8+ installed
- [ ] All pip packages installed
- [ ] Tesseract OCR installed and in PATH
- [ ] MySQL running
- [ ] Database and table created
- [ ] Database credentials configured
- [ ] Flask server running (port 5000)
- [ ] React portal running (port 5173)
- [ ] Can access certificates page
- [ ] Can generate certificates
- [ ] Can upload and verify certificates

## Next Steps

Once everything is working:

1. **Customize the UI**: Edit `portal/src/pages/CertificatesPage.tsx`
2. **Add more platforms**: Modify `auth.py` to add verification for other platforms
3. **Enhance security**: Add authentication, rate limiting, etc.
4. **Deploy**: Follow deployment guides for Flask and React

## Getting Help

If you encounter issues:

1. Check `certificate_backend/README.md` for detailed documentation
2. Review `CERTIFICATE_INTEGRATION_SUMMARY.md` for architecture
3. Check `ARCHITECTURE_DIAGRAM.md` for visual overview
4. Look at browser console for frontend errors (F12)
5. Check Flask terminal for backend errors

## Terminal Summary

You need **2 terminals running simultaneously**:

**Terminal 1 (Flask Backend):**
```powershell
cd "e:\projects\Random Projects\DIDfinal\certificate_backend"
python auth.py
```

**Terminal 2 (React Portal):**
```powershell
cd "e:\projects\Random Projects\DIDfinal\portal"
npm run dev
```

## Success Indicators

✅ Flask backend shows: `Running on http://127.0.0.1:5000`
✅ React portal shows: `Local: http://localhost:5173/`
✅ Can access portal in browser
✅ Certificates tab visible in navigation
✅ Can generate and download certificates
✅ Can upload and verify certificates

## Production Deployment

For production, you'll need:
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS
- [ ] Use production WSGI server (Gunicorn)
- [ ] Set up proper authentication
- [ ] Configure CORS properly
- [ ] Use production database credentials
- [ ] Set up monitoring and logging
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Enable security headers

Happy certificate authenticating! 🎓✨
