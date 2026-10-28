import json
import sqlite3
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

import server


class AdminApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_database = server.DATABASE
        self.original_password = server.ADMIN_PASSWORD
        server.DATABASE = Path(self.temp_dir.name) / "test.sqlite3"
        server.ADMIN_PASSWORD = "test-password-1234"
        server.initialize_database()
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.GreetingHandler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.httpd.server_port}"
        self.device_id = "a" * 64
        status, _ = self.request(
            "/api/accounts",
            "POST",
            {"device_id": self.device_id, "name": "Dita"},
        )
        self.assertEqual(status, 201)

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join()
        server.DATABASE = self.original_database
        server.ADMIN_PASSWORD = self.original_password
        self.temp_dir.cleanup()

    def request(self, path, method="GET", payload=None, token=None):
        data = json.dumps(payload).encode() if payload is not None else None
        headers = {"Content-Type": "application/json"} if payload is not None else {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = urllib.request.Request(
            self.base_url + path,
            data=data,
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            try:
                return error.code, json.loads(error.read())
            finally:
                error.close()

    def test_login_protects_admin_list_and_delete(self):
        self.assertEqual(self.request("/api/admin/greetings")[0], 401)
        self.assertEqual(self.request("/api/admin/greetings/1", "DELETE")[0], 401)

        status, login = self.request(
            "/api/admin/login",
            "POST",
            {"password": server.ADMIN_PASSWORD},
        )
        self.assertEqual(status, 200)
        token = login["token"]

        status, payload = self.request("/api/admin/greetings", token=token)
        self.assertEqual(status, 200)
        self.assertEqual(len(payload["greetings"]), 3)

        greeting_id = payload["greetings"][0]["id"]
        self.assertEqual(
            self.request(f"/api/admin/greetings/{greeting_id}", "DELETE", token=token)[0],
            200,
        )
        self.assertEqual(len(self.request("/api/admin/greetings", token=token)[1]["greetings"]), 2)

    def test_browser_can_register_only_one_account(self):
        status, account = self.request(f"/api/accounts/{self.device_id}")
        self.assertEqual(status, 200)
        self.assertEqual(account["account"]["name"], "Dita")
        self.assertEqual(
            self.request(
                "/api/accounts",
                "POST",
                {"device_id": self.device_id, "name": "Nama kedua"},
            )[0],
            409,
        )

    def test_greeting_requires_account_and_uses_account_name(self):
        self.assertEqual(
            self.request("/api/greetings", "POST", {"message": "Tanpa akun"})[0],
            401,
        )
        status, payload = self.request(
            "/api/greetings",
            "POST",
            {"device_id": self.device_id, "name": "Nama palsu", "message": "Halo semua"},
        )
        self.assertEqual(status, 201)
        self.assertEqual(payload["greeting"]["name"], "Dita")

    def test_public_users_can_reply_and_delete_parent_cascades(self):
        greetings = self.request("/api/greetings")[1]["greetings"]
        greeting_id = greetings[0]["id"]

        second_device_id = "b" * 64
        self.assertEqual(
            self.request(
                "/api/accounts",
                "POST",
                {"device_id": second_device_id, "name": "Raka"},
            )[0],
            201,
        )
        self.assertEqual(
            self.request(
                f"/api/greetings/{greeting_id}/replies",
                "POST",
                {"message": "Balasan tanpa akun"},
            )[0],
            401,
        )

        status, payload = self.request(
            f"/api/greetings/{greeting_id}/replies",
            "POST",
            {"device_id": self.device_id, "message": "Aku juga suka kopi susu!"},
        )
        self.assertEqual(status, 201)
        self.assertEqual(payload["reply"]["greeting_id"], greeting_id)
        self.assertEqual(payload["reply"]["name"], "Dita")
        root_reply_id = payload["reply"]["id"]

        status, child_payload = self.request(
            f"/api/greetings/{greeting_id}/replies",
            "POST",
            {
                "device_id": second_device_id,
                "message": "Setuju, apalagi kalau tidak terlalu manis.",
                "parent_reply_id": root_reply_id,
            },
        )
        self.assertEqual(status, 201)
        self.assertEqual(child_payload["reply"]["parent_reply_id"], root_reply_id)

        refreshed = self.request("/api/greetings")[1]["greetings"]
        parent = next(item for item in refreshed if item["id"] == greeting_id)
        self.assertEqual(len(parent["replies"]), 1)
        self.assertEqual(parent["replies"][0]["message"], "Aku juga suka kopi susu!")
        self.assertEqual(len(parent["replies"][0]["children"]), 1)
        self.assertEqual(
            parent["replies"][0]["children"][0]["message"],
            "Setuju, apalagi kalau tidak terlalu manis.",
        )
        self.assertEqual(parent["replies"][0]["children"][0]["name"], "Raka")

        self.assertEqual(
            self.request(
                f"/api/greetings/99999/replies",
                "POST",
                {"device_id": self.device_id, "message": "Hai"},
            )[0],
            404,
        )
        other_greeting_id = next(item["id"] for item in refreshed if item["id"] != greeting_id)
        self.assertEqual(
            self.request(
                f"/api/greetings/{other_greeting_id}/replies",
                "POST",
                {
                    "device_id": self.device_id,
                    "message": "Balasan lintas utas",
                    "parent_reply_id": root_reply_id,
                },
            )[0],
            404,
        )
        self.assertEqual(
            self.request(f"/api/admin/greetings/{greeting_id}", "DELETE", token="invalid")[0],
            401,
        )

        _, login = self.request(
            "/api/admin/login",
            "POST",
            {"password": server.ADMIN_PASSWORD},
        )
        self.assertEqual(
            self.request(
                f"/api/admin/greetings/{greeting_id}",
                "DELETE",
                token=login["token"],
            )[0],
            200,
        )
        with server.connect_database() as connection:
            remaining_replies = connection.execute(
                "SELECT COUNT(*) FROM replies WHERE greeting_id = ?",
                (greeting_id,),
            ).fetchone()[0]
        self.assertEqual(remaining_replies, 0)

    def test_existing_reply_table_migrates_without_losing_rows(self):
        current_database = server.DATABASE
        legacy_database = Path(self.temp_dir.name) / "legacy.sqlite3"
        try:
            server.DATABASE = legacy_database
            connection = sqlite3.connect(legacy_database)
            try:
                with connection:
                    connection.execute(
                        "CREATE TABLE greetings (id INTEGER PRIMARY KEY, name TEXT NOT NULL, "
                        "message TEXT NOT NULL, created_at TEXT NOT NULL, waves INTEGER NOT NULL DEFAULT 0)"
                    )
                    connection.execute(
                        "CREATE TABLE replies (id INTEGER PRIMARY KEY, greeting_id INTEGER NOT NULL, "
                        "name TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)"
                    )
                    connection.execute(
                        "INSERT INTO greetings (id, name, message, created_at) "
                        "VALUES (1, 'Nadia', 'Sapaan lama', '2026-01-01T00:00:00+00:00')"
                    )
                    connection.execute(
                        "INSERT INTO replies (id, greeting_id, name, message, created_at) "
                        "VALUES (1, 1, 'Raka', 'Balasan lama', '2026-01-01T00:01:00+00:00')"
                    )
            finally:
                connection.close()

            server.initialize_database()
            with server.connect_database() as connection:
                columns = {row["name"] for row in connection.execute("PRAGMA table_info(replies)")}
                reply = connection.execute("SELECT * FROM replies WHERE id = 1").fetchone()
                greeting_columns = {row["name"] for row in connection.execute("PRAGMA table_info(greetings)")}
        finally:
            server.DATABASE = current_database

        self.assertIn("parent_reply_id", columns)
        self.assertIn("device_id", columns)
        self.assertIn("device_id", greeting_columns)
        self.assertEqual(reply["message"], "Balasan lama")
        self.assertIsNone(reply["parent_reply_id"])


if __name__ == "__main__":
    unittest.main()