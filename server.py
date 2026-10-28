import json
import hashlib
import hmac
import os
import secrets
import sqlite3
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "teman_ngopi.sqlite3"
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
MAX_BODY_BYTES = 4096
STATIC_FILES = {
    "/manifest.webmanifest": ("manifest.webmanifest", "application/manifest+json; charset=utf-8"),
    "/sw.js": ("sw.js", "text/javascript; charset=utf-8"),
    "/icon-192.png": ("icon-192.png", "image/png"),
    "/icon-512.png": ("icon-512.png", "image/png"),
    "/admin": ("admin.html", "text/html; charset=utf-8"),
}
VERSION_FILES = ("index.html", "admin.html", "manifest.webmanifest", "sw.js", "icon-192.png", "icon-512.png")
ADMIN_SESSIONS = {}
ADMIN_SESSIONS_LOCK = threading.Lock()
LOGIN_ATTEMPTS = {}
LOGIN_ATTEMPTS_LOCK = threading.Lock()
ADMIN_SESSION_SECONDS = 8 * 60 * 60
LOGIN_WINDOW_SECONDS = 15 * 60
MAX_LOGIN_ATTEMPTS = 5
SEED_GREETINGS = (
    ("Nadia", "Halo semuanya! Lagi cari rekomendasi kopi susu yang enak di sekitar Bandung ☕"),
    ("Raka", "Selamat sore! Semoga kopinya pas dan harinya juga ikut membaik."),
    ("Mira", "Ada yang suka baca buku sambil ngopi juga? Aku lagi baca novel seru nih."),
)


@contextmanager
def connect_database():
    connection = sqlite3.connect(DATABASE, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    with connect_database() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS greetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                waves INTEGER NOT NULL DEFAULT 0
            )"""
        )
        count = connection.execute("SELECT COUNT(*) FROM greetings").fetchone()[0]
        if count == 0:
            now = datetime.now(timezone.utc).isoformat()
            connection.executemany(
                "INSERT INTO greetings (name, message, created_at) VALUES (?, ?, ?)",
                [(name, message, now) for name, message in SEED_GREETINGS],
            )


def greeting_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "message": row["message"],
        "created_at": row["created_at"],
        "waves": row["waves"],
    }


def get_app_version():
    digest = hashlib.sha256()
    for filename in VERSION_FILES:
        digest.update((ROOT / filename).read_bytes())
    return digest.hexdigest()


class GreetingHandler(BaseHTTPRequestHandler):
    server_version = "TemanNgopi/1.0"

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY_BYTES:
            return None
        try:
            return json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def is_admin(self):
        authorization = self.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            return False
        token = authorization[7:]
        now = time.monotonic()
        with ADMIN_SESSIONS_LOCK:
            expires_at = ADMIN_SESSIONS.get(token)
            if expires_at is None:
                return False
            if expires_at <= now:
                del ADMIN_SESSIONS[token]
                return False
            return True

    def login_is_limited(self):
        now = time.monotonic()
        address = self.client_address[0]
        with LOGIN_ATTEMPTS_LOCK:
            started_at, attempts = LOGIN_ATTEMPTS.get(address, (now, 0))
            if now - started_at >= LOGIN_WINDOW_SECONDS:
                LOGIN_ATTEMPTS[address] = (now, 0)
                return False
            return attempts >= MAX_LOGIN_ATTEMPTS

    def record_login_failure(self):
        now = time.monotonic()
        address = self.client_address[0]
        with LOGIN_ATTEMPTS_LOCK:
            started_at, attempts = LOGIN_ATTEMPTS.get(address, (now, 0))
            if now - started_at >= LOGIN_WINDOW_SECONDS:
                started_at, attempts = now, 0
            LOGIN_ATTEMPTS[address] = (started_at, attempts + 1)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/version":
            return self.send_json(200, {"version": get_app_version()})

        if path == "/api/admin/greetings":
            if not self.is_admin():
                return self.send_json(401, {"error": "Login admin diperlukan."})
            with connect_database() as connection:
                rows = connection.execute(
                    "SELECT id, name, message, created_at, waves "
                    "FROM greetings ORDER BY id DESC LIMIT 200"
                ).fetchall()
            return self.send_json(200, {"greetings": [greeting_to_dict(row) for row in rows]})

        if path == "/api/greetings":
            with connect_database() as connection:
                rows = connection.execute(
                    "SELECT id, name, message, created_at, waves "
                    "FROM greetings ORDER BY id DESC LIMIT 100"
                ).fetchall()
            return self.send_json(200, {"greetings": [greeting_to_dict(row) for row in rows]})

        if path in ("/", "/index.html"):
            file_path = ROOT / "index.html"
            content_type = "text/html; charset=utf-8"
        elif path in STATIC_FILES:
            filename, content_type = STATIC_FILES[path]
            file_path = ROOT / filename
        else:
            return self.send_json(404, {"error": "Halaman tidak ditemukan."})

        body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache" if path in ("/", "/index.html", "/admin", "/sw.js", "/manifest.webmanifest") else "public, max-age=86400")
        self.send_header("X-Content-Type-Options", "nosniff")
        if path == "/sw.js":
            self.send_header("Service-Worker-Allowed", "/")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path == "/api/admin/login":
            if not ADMIN_PASSWORD:
                return self.send_json(503, {"error": "ADMIN_PASSWORD belum diatur pada server."})
            if self.login_is_limited():
                return self.send_json(429, {"error": "Terlalu banyak percobaan. Coba lagi 15 menit."})
            payload = self.read_json()
            password = payload.get("password") if isinstance(payload, dict) else None
            if not isinstance(password, str) or not hmac.compare_digest(password, ADMIN_PASSWORD):
                self.record_login_failure()
                return self.send_json(401, {"error": "Kata sandi admin salah."})
            address = self.client_address[0]
            with LOGIN_ATTEMPTS_LOCK:
                LOGIN_ATTEMPTS.pop(address, None)
            token = secrets.token_urlsafe(32)
            with ADMIN_SESSIONS_LOCK:
                ADMIN_SESSIONS[token] = time.monotonic() + ADMIN_SESSION_SECONDS
            return self.send_json(200, {"token": token})

        if path == "/api/admin/logout":
            authorization = self.headers.get("Authorization", "")
            token = authorization[7:] if authorization.startswith("Bearer ") else ""
            with ADMIN_SESSIONS_LOCK:
                ADMIN_SESSIONS.pop(token, None)
            return self.send_json(200, {"ok": True})

        if path == "/api/greetings":
            payload = self.read_json()
            if not isinstance(payload, dict):
                return self.send_json(400, {"error": "Format sapaan tidak valid."})

            name = payload.get("name")
            message = payload.get("message")
            if not isinstance(name, str) or not isinstance(message, str):
                return self.send_json(400, {"error": "Nama dan pesan wajib diisi."})
            name = name.strip()
            message = message.strip()
            if not name or len(name) > 32 or not message or len(message) > 180:
                return self.send_json(400, {"error": "Nama atau pesan melewati batas."})

            created_at = datetime.now(timezone.utc).isoformat()
            with connect_database() as connection:
                cursor = connection.execute(
                    "INSERT INTO greetings (name, message, created_at) VALUES (?, ?, ?)",
                    (name, message, created_at),
                )
                row = connection.execute(
                    "SELECT id, name, message, created_at, waves FROM greetings WHERE id = ?",
                    (cursor.lastrowid,),
                ).fetchone()
            return self.send_json(201, {"greeting": greeting_to_dict(row)})

        prefix = "/api/greetings/"
        suffix = "/wave"
        if path.startswith(prefix) and path.endswith(suffix):
            greeting_id = path[len(prefix):-len(suffix)].strip("/")
            if not greeting_id.isdigit():
                return self.send_json(404, {"error": "Sapaan tidak ditemukan."})
            with connect_database() as connection:
                connection.execute(
                    "UPDATE greetings SET waves = waves + 1 WHERE id = ?",
                    (int(greeting_id),),
                )
                row = connection.execute(
                    "SELECT id, name, message, created_at, waves FROM greetings WHERE id = ?",
                    (int(greeting_id),),
                ).fetchone()
            if row is None:
                return self.send_json(404, {"error": "Sapaan tidak ditemukan."})
            return self.send_json(200, {"greeting": greeting_to_dict(row)})

        return self.send_json(404, {"error": "Endpoint tidak ditemukan."})

    def do_DELETE(self):
        prefix = "/api/admin/greetings/"
        path = urlsplit(self.path).path
        if not path.startswith(prefix):
            return self.send_json(404, {"error": "Endpoint tidak ditemukan."})
        if not self.is_admin():
            return self.send_json(401, {"error": "Login admin diperlukan."})
        greeting_id = path[len(prefix):].strip("/")
        if not greeting_id.isdigit():
            return self.send_json(404, {"error": "Sapaan tidak ditemukan."})
        with connect_database() as connection:
            cursor = connection.execute("DELETE FROM greetings WHERE id = ?", (int(greeting_id),))
        if cursor.rowcount == 0:
            return self.send_json(404, {"error": "Sapaan tidak ditemukan."})
        return self.send_json(200, {"ok": True})

    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}")


def main():
    if ADMIN_PASSWORD and len(ADMIN_PASSWORD) < 16:
        raise SystemExit("ADMIN_PASSWORD harus minimal 16 karakter.")
    initialize_database()
    server = ThreadingHTTPServer((HOST, PORT), GreetingHandler)
    print(f"Teman Ngopi berjalan di http://localhost:{PORT}")
    print("Tekan Ctrl+C untuk menghentikan server.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
