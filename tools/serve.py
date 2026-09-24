#!/usr/bin/env python3
"""Serve the site locally, threaded, with byte ranges.

    python3 tools/serve.py [port]

Two things the stdlib server does not do, both of which break this site:

* Threading. The hero filmstrip pulls several short videos at once, and the
  single-threaded default answers one request at a time, so every clip stalls
  at readyState 0 and the strip looks like a row of stills.

* Range requests. SimpleHTTPRequestHandler ignores `Range` and answers 200 with
  the whole file, so <video> cannot seek: dragging the scrub bar on the film
  appears to do nothing. Real static hosts (nginx, GitHub Pages) serve ranges,
  so this only ever bit the local preview.

* Both loopback stacks. Chrome resolves `localhost` to ::1 first, so an
  IPv4-only listener answers curl fine and gives the browser
  ERR_CONNECTION_REFUSED.
"""
import io
import os
import re
import socket
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RANGE_RE = re.compile(r"^bytes=(\d*)-(\d*)$")


class _Slice(io.RawIOBase):
    """A file handle that stops after `length` bytes, for copyfile()."""

    def __init__(self, f, length):
        self.f = f
        self.remaining = length

    def readable(self):
        return True

    def read(self, n=-1):
        if self.remaining <= 0:
            return b""
        if n is None or n < 0 or n > self.remaining:
            n = self.remaining
        data = self.f.read(n)
        self.remaining -= len(data)
        return data

    def close(self):
        try:
            self.f.close()
        finally:
            super().close()


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # A dev server for a site being edited live: without no-store, Chrome
        # keeps serving the previous site.css and you debug the old file.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        header = self.headers.get("Range")
        if not header:
            return super().send_head()
        m = RANGE_RE.match(header.strip())
        path = self.translate_path(self.path)
        if not m or os.path.isdir(path):
            return super().send_head()

        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        size = os.fstat(f.fileno()).st_size
        first, last = m.group(1), m.group(2)
        if first == "":                       # bytes=-N -> the final N bytes
            if last == "":
                f.close()
                return super().send_head()
            start, end = max(0, size - int(last)), size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1

        if start >= size:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        end = min(end, size - 1)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        f.seek(start)
        return _Slice(f, end - start + 1)


os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class V6Server(ThreadingHTTPServer):
    address_family = socket.AF_INET6


try:
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
except OSError as e:
    if e.errno != 48:
        raise
    # Errno 48 with allow_reuse_address set means a live listener, not TIME_WAIT.
    pid = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True,
                         text=True).stdout.split()
    who = f" (pid {pid[0]})" if pid else ""
    print(f"Something is already serving port {port}{who}.\n"
          f"  open it:    http://localhost:{port}\n"
          f"  take over:  kill {pid[0] if pid else '<pid>'} && "
          f"python3 tools/serve.py {port}\n"
          f"  or:         python3 tools/serve.py {port + 1}")
    sys.exit(1)

# ...and the same tree on ::1, because that is what the browser asks for first.
try:
    srv6 = V6Server(("::1", port), Handler)
    threading.Thread(target=srv6.serve_forever, daemon=True).start()
except OSError:
    pass                                  # no IPv6 loopback here; IPv4 is enough

print(f"http://localhost:{port}  (ctrl-c to stop)")
try:
    srv.serve_forever()
except KeyboardInterrupt:
    print()
