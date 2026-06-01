from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    if not os.path.isdir(ROOT):
        print(f"ERROR: public folder not found: {ROOT}", file=sys.stderr)
        sys.exit(1)
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler)
    print(f"Serving {ROOT} on http://127.0.0.1:{PORT} (no-cache)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
