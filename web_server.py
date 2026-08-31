"""
web_server.py
Servidor Web HTTP local con API REST y Frontend Web Moderno.
Sirve las llaves públicas de Alicia, Betito y Candy, e interfaz interactiva para el navegador.
"""

import os
import json
import threading
import urllib.parse
import hashlib
from http.server import HTTPServer, SimpleHTTPRequestHandler
from typing import Optional

from key_manager import KeyManager, PUBLIC_WEB_DIR, SERVER_PORT


class PublicKeysHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Manejador HTTP para servir Frontend estático, llaves PEM y endpoints API."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_WEB_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. API endpoint: /api/keys (lista de usuarios, URLs y fingerprints)
        if path == "/api/keys":
            km = KeyManager()
            keys_data = []
            for user in ["Alicia", "Betito", "Candy"]:
                pem = km.load_public_key_pem_text(user)
                fp_sha256 = hashlib.sha256(pem.encode("utf-8")).hexdigest()
                formatted_fp = ":".join(fp_sha256[i:i+2].upper() for i in range(0, 32, 2))
                keys_data.append({
                    "user": user,
                    "role": "Emisora A" if user == "Alicia" else ("Receptor" if user == "Betito" else "Emisora B / Alter"),
                    "filename": f"{user.lower()}_pub.pem",
                    "url": f"/keys/{user.lower()}_pub.pem",
                    "full_url": km.get_public_key_url(user),
                    "fingerprint": formatted_fp,
                    "key_type": "RSA 2048 bits",
                    "pem": pem
                })

            response_bytes = json.dumps({"status": "ok", "keys": keys_data}, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response_bytes)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        # 2. Descarga directa de archivos PEM: /keys/<user>_pub.pem
        elif path.startswith("/keys/"):
            filename = os.path.basename(path)
            file_path = os.path.join(PUBLIC_WEB_DIR, filename)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                with open(file_path, "rb") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/x-pem-file")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Disposition", f'inline; filename="{filename}"')
                self.end_headers()
                self.wfile.write(data)
                return
            else:
                self.send_error(404, f"Llave pública '{filename}' no encontrada.")
                return

        # 3. Frontend estático estándar (index.html, style.css, app.js, etc.)
        super().do_GET()

    def end_headers(self):
        # Habilitar CORS para todas las respuestas estáticas
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        # Suprimir logs ruidosos en consola
        pass


class WebKeyServer:
    """Controlador del servidor HTTP en segundo plano."""

    def __init__(self, port: int = SERVER_PORT):
        self.port = port
        self.httpd: Optional[HTTPServer] = None
        self.thread: Optional[threading.Thread] = None
        self.is_running = False

    def start(self):
        if self.is_running:
            return
        KeyManager()  # Asegura generación de llaves en public_web/
        try:
            self.httpd = HTTPServer(("0.0.0.0", self.port), PublicKeysHTTPRequestHandler)
            self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
            self.thread.start()
            self.is_running = True
            print(f"[+] Servidor Web de Llaves activo en: http://localhost:{self.port}")
        except Exception as e:
            print(f"[-] Error iniciando servidor web: {e}")

    def stop(self):
        if self.httpd and self.is_running:
            self.httpd.shutdown()
            self.httpd.server_close()
            self.is_running = False
            print("[+] Servidor Web de Llaves detenido.")


if __name__ == "__main__":
    import time
    server = WebKeyServer(SERVER_PORT)
    server.start()
    print("Servidor activo. Presiona Ctrl+C para salir.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        server.stop()
