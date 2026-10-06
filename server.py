#!/usr/bin/env python3
"""
VAULT: The Haptic Heist — Local Development Server
Provides clean HTTP serving with proper MIME types, CORS headers, and no caching.
"""

import http.server
import socketserver
import os
import sys

PORT = int(os.environ.get("PORT", 8080))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class VaultHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Отключаем кэш для быстрой разработки
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        # Разрешаем запуск в iframe/Telegram WebApp
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), VaultHTTPRequestHandler) as httpd:
        print(f"============================================================")
        print(f"🔐 VAULT Local Server running at http://localhost:{PORT}")
        print(f"📁 Serving directory: {DIRECTORY}")
        print(f"============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")
            sys.exit(0)
