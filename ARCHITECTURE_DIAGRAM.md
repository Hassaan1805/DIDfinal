# Certificate Authenticator Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DIDfinal Project                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                 │
│                    http://localhost:5173                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │   Dashboard    │  │   Projects     │  │     Security           │   │
│  └────────────────┘  └────────────────┘  └────────────────────────┘   │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │  Blockchain    │  │   Analytics    │  │  🆕 Certificates       │   │
│  └────────────────┘  └────────────────┘  └────────────────────────┘   │
│                                                    │                     │
│                                                    │ Router              │
│                                                    ▼                     │
│                                    /certificates route                  │
│                                                    │                     │
│                                                    ▼                     │
│                          ┌─────────────────────────────────────┐        │
│                          │   CertificatesPage.tsx              │        │
│                          │                                     │        │
│                          │  • Generate Certificates            │        │
│                          │  • Upload Certificates              │        │
│                          │  • Verify Certificates              │        │
│                          │  • Preview Certificates             │        │
│                          │  • Animated UI                      │        │
│                          └─────────────────────────────────────┘        │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
                                    │ HTTP Requests
                                    │ (Fetch API)
                                    │
                ┌───────────────────┴────────────────────┐
                │                                        │
                ▼                                        ▼
┌───────────────────────────────┐    ┌─────────────────────────────────────┐
│  Node.js Backend (Express)    │    │  🆕 Flask Backend (Python)          │
│  http://localhost:3001         │    │  http://localhost:5000              │
├───────────────────────────────┤    ├─────────────────────────────────────┤
│                                │    │                                      │
│  • DID Authentication          │    │  • Certificate Generation           │
│  • ZK Proof Verification       │    │  • Certificate Verification         │
│  • JWT Session Management      │    │  • Multi-Platform Support           │
│  • User Management             │    │  • OCR Text Extraction              │
│  • RBAC                        │    │  • QR Code Scanning                 │
│                                │    │  • File Upload/Download             │
└───────────────────────────────┘    └─────────────────────────────────────┘
                                                        │
                                                        │
                                                        ▼
                                      ┌─────────────────────────────────────┐
                                      │  MySQL Database                      │
                                      ├─────────────────────────────────────┤
                                      │                                      │
                                      │  certificates table:                │
                                      │  • serial_number (unique)           │
                                      │  • name                             │
                                      │  • organization                     │
                                      │  • issue_date                       │
                                      │  • expiry_date                      │
                                      │  • completion_date                  │
                                      │  • issuer                           │
                                      │  • hash (SHA-256)                   │
                                      │  • created_at                       │
                                      │                                      │
                                      └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐│
│  │  Udemy API       │  │ Great Learning API│  │ Google Education     ││
│  │  (URL Verify)    │  │  (URL Verify)     │  │ (QR Code Verify)     ││
│  └──────────────────┘  └───────────────────┘  └──────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         FILE SYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  certificate_backend/certificates/                                      │
│  • Generated PDFs                                                       │
│  • Uploaded certificate files                                           │
│  • Certificate images                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      CERTIFICATE FLOW                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. GENERATION:                                                         │
│     User → Fill Form → POST /generate → Generate PDF → Store in DB     │
│                                       → Return download link            │
│                                                                          │
│  2. UPLOAD & VERIFY:                                                    │
│     User → Select Platform → Upload File → Extract Data (OCR/QR)       │
│          → Check Database/API → Return Verification Result             │
│                                                                          │
│  3. AUTHENTICATION:                                                     │
│     User → Enter Serial # → POST /authenticate → Check DB Hash         │
│          → Return Authentic/Not Authentic                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGY STACK                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Frontend:                                                              │
│  • React 19 + TypeScript                                                │
│  • Vite (build tool)                                                    │
│  • Tailwind CSS                                                         │
│  • React Router DOM                                                     │
│                                                                          │
│  Certificate Backend:                                                   │
│  • Flask (Python web framework)                                         │
│  • Tesseract OCR (text extraction)                                      │
│  • OpenCV (QR code scanning)                                            │
│  • Pillow (image processing)                                            │
│  • ReportLab (PDF generation)                                           │
│  • PyMuPDF (PDF reading)                                                │
│  • MySQL Connector                                                      │
│                                                                          │
│  Database:                                                              │
│  • MySQL 8.0+                                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Integration Points

1. **Navigation Bar** - Added "Certificates" tab in `EnterprisePortalProfessional.tsx`
2. **Routing** - New `/certificates` route in `App.tsx`
3. **Component** - New `CertificatesPage.tsx` with full UI
4. **Backend** - Separate Flask server in `certificate_backend/`
5. **Database** - MySQL database for certificate storage

## User Journey

```
Portal Login → Authenticate with DID → Access Dashboard
                                              │
                                              ├─→ Dashboard
                                              ├─→ Projects
                                              ├─→ Security
                                              ├─→ Blockchain
                                              ├─→ Analytics
                                              └─→ 🆕 Certificates
                                                        │
                                                        ├─→ Generate New
                                                        ├─→ Upload & Verify
                                                        └─→ View Results
```
