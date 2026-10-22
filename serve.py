"""Local server for the Center Spread: python3 serve.py [port]

Plain static files, but with caching switched off so an edited module shows
up on the next reload instead of whenever the browser feels like re-fetching.
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_PORT = 8010


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # quieter than the default
        if "404" in str(args):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    handler = partial(NoCacheHandler, directory=str(Path(__file__).resolve().parent))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"Center Spread at http://localhost:{port}/  (Ctrl-C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
