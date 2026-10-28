import json
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

    def test_public_users_can_reply_and_delete_parent_cascades(self):
        greetings = self.request("/api/greetings")[1]["greetings"]
        greeting_id = greetings[0]["id"]

        status, payload = self.request(
            f"/api/greetings/{greeting_id}/replies",
            "POST",
            {"name": "Dita", "message": "Aku juga suka kopi susu!"},
        )
        self.assertEqual(status, 201)
        self.assertEqual(payload["reply"]["greeting_id"], greeting_id)

        refreshed = self.request("/api/greetings")[1]["greetings"]
        parent = next(item for item in refreshed if item["id"] == greeting_id)
        self.assertEqual(len(parent["replies"]), 1)
        self.assertEqual(parent["replies"][0]["message"], "Aku juga suka kopi susu!")

        self.assertEqual(
            self.request(f"/api/greetings/99999/replies", "POST", {"name": "Dita", "message": "Hai"})[0],
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


if __name__ == "__main__":
    unittest.main()