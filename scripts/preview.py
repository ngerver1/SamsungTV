"""Serve app/ on this computer so you can try the launcher with the keyboard.
Arrow keys = remote arrows, Enter = OK, Escape or Backspace = Back."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / 'app'


class Preview(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4795)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Preview, directory=str(APP)))
    print('Serif Home preview: http://127.0.0.1:' + str(server.server_port) + '/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
