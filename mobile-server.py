#!/usr/bin/env python3
"""
Simple HTTP server to serve the mobile wallet with proper HTTPS/camera permissions
"""
import http.server
import socketserver
import ssl
import os
import sys
from pathlib import Path

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Permissions-Policy', 'camera=*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def main():
    PORT = 8443  # HTTPS port
    
    # Change to current directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Create server
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        print(f"📱 Mobile Wallet Server Starting...")
        print(f"🌐 Server running on port {PORT}")
        
        # Get local IP addresses
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        
        print(f"\n📱 Access from your phone:")
        print(f"   http://{local_ip}:{PORT}/mobile-wallet.html")
        print(f"   http://localhost:{PORT}/mobile-wallet.html")
        
        # Try to get all network interfaces
        try:
            import subprocess
            result = subprocess.run(['ipconfig'], capture_output=True, text=True, shell=True)
            lines = result.stdout.split('\n')
            ips = []
            for line in lines:
                if 'IPv4' in line and '192.168' in line:
                    ip = line.split(':')[-1].strip()
                    if ip and ip != local_ip:
                        ips.append(ip)
            
            if ips:
                print(f"\n🔗 Alternative URLs:")
                for ip in ips:
                    print(f"   http://{ip}:{PORT}/mobile-wallet.html")
        except:
            pass
        
        print(f"\n💡 Instructions:")
        print(f"   1. Connect your phone to the same WiFi network")
        print(f"   2. Open browser on phone")
        print(f"   3. Navigate to one of the URLs above")
        print(f"   4. Camera should work properly!")
        print(f"\n🛑 Press Ctrl+C to stop server\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")
            sys.exit(0)

if __name__ == "__main__":
    main()
