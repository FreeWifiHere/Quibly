"""Run the local Quibly app and keep the OpenAI key on the server."""

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from openai_request import OpenAIRequestError, generate_study_game


PROJECT_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = PROJECT_DIR / "public"
HOST = "127.0.0.1"
PORT = 8000


class QuiblyHandler(BaseHTTPRequestHandler):
    server_version = "QuiblyLocal/1.0"

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path):
        body = file_path.read_bytes()
        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        request_path = urlparse(self.path).path
        if request_path == "/api/health":
            self._send_json({"ok": True})
            return

        relative_path = "index.html" if request_path == "/" else request_path.lstrip("/")
        candidate = (PUBLIC_DIR / relative_path).resolve()
        if PUBLIC_DIR not in candidate.parents or not candidate.is_file():
            self._send_json({"error": "Not found"}, status=404)
            return
        self._send_file(candidate)

    def do_POST(self):
        if urlparse(self.path).path != "/api/generate":
            self._send_json({"error": "Not found"}, status=404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length > 25000:
                self._send_json({"error": "Please keep your notes under 25,000 characters."}, status=413)
                return
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            notes = str(payload.get("notes", "")).strip()
            goal = str(payload.get("goal", "")).strip()
            game_style = str(payload.get("gameStyle", "Quick quiz")).strip()
            if len(notes) < 12:
                self._send_json({"error": "Add a few lines of notes first so Quibly can build a game."}, status=400)
                return
            game = generate_study_game(notes, goal, game_style)
            self._send_json({"game": game})
        except (ValueError, json.JSONDecodeError):
            self._send_json({"error": "That request was not formatted correctly. Please try again."}, status=400)
        except OpenAIRequestError:
            self._send_json({"error": "Quibly could not make the game. Please check the OpenAI key in .env and try again."}, status=502)
        except Exception:
            self._send_json({"error": "Quibly hit a small problem. Please check the OpenAI key in .env and try again."}, status=500)

    def log_message(self, format_string, *args):
        # Keep the local terminal quiet and never risk echoing request data.
        return


if __name__ == "__main__":
    print(f"Quibly is ready at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop the local server.")
    ThreadingHTTPServer((HOST, PORT), QuiblyHandler).serve_forever()
