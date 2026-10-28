import json
import os
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "teman_ngopi.sqlite3"
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))
MAX_BODY_BYTES = 4096
STATIC_FILES = {
    "/manifest.webmanifest": ("manifest.webmanifest", "application/manifest+json; charset=utf-8"),
    "/sw.js": ("sw.js", "text/javascript; charset=utf-8"),
    "/icon-192.png": ("icon-192.png", "image/png"),
    "/icon-512.png": ("icon-512.png", "image/png"),
}
SEED_GREETINGS = (
    ("Nadia", "Halo semuanya! Lagi cari rekomendasi kopi susu yang enak di sekitar Bandung ☕"),
    ("Raka", "Selamat sore! Semoga kopinya pas dan harinya juga ikut membaik."),
    ("Mira", "Ada yang suka baca buku sambil ngopi juga? Aku lagi baca novel seru nih."),
)


def connect_database():
    connection = sqlite3.connect(DATABASE, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


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

    def do_GET(self):
        path = urlsplit(self.path).path
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
        self.send_header("Cache-Control", "no-cache" if path in ("/", "/index.html", "/sw.js", "/manifest.webmanifest") else "public, max-age=86400")
        self.send_header("X-Content-Type-Options", "nosniff")
        if path == "/sw.js":
            self.send_header("Service-Worker-Allowed", "/")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = urlsplit(self.path).path
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

    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}")


def main():
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
