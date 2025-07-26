@echo off
echo Starting Decentralized Trust Platform Portal...
echo.
cd /d "C:\Users\Zaid\Documents\New folder (11)\portal"
echo Portal directory: %CD%
echo.
echo Starting Vite development server...
echo You can access the portal at:
echo   - http://localhost:5173
echo   - http://127.0.0.1:5173
echo.
npx vite --host 0.0.0.0 --port 5173 --open
pause
