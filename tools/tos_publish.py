"""Publish the PDMD site tree + the source archive to TOS."""
import mimetypes, os, sys, yaml, bytedtos

ROOT = sys.argv[1]           # unpacked site tree
ZIP = sys.argv[2]            # the source archive
PREFIX = "user/gqian/website/pdmd"
ZIP_KEY = "user/gqian/website/pdmd-website-src.zip"

# only what index.html actually references; skills/ and tools/ ship in the zip
# .nojekyll is a GitHub Pages marker and is zero bytes; TOS rejects empty
# objects ("not support empty object temporarily"), and it has no meaning here.
SERVE_FILES = ["index.html", "site.css", "site.js", "radar.js", "data.js", "film.mp4"]
SERVE_DIRS = ["posters", "strip", "logos", "fig3"]

TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".js": "application/javascript; charset=utf-8", ".mp4": "video/mp4",
         ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
         ".svg": "image/svg+xml", ".json": "application/json", ".zip": "application/zip",
         ".woff2": "font/woff2", ".ttf": "font/ttf", ".md": "text/markdown; charset=utf-8"}

cfg = yaml.safe_load(open(os.path.expanduser("~/nebuconfig.yaml")))
c = bytedtos.Client(cfg["tos_bucket"], cfg["tos_user_access_key"], idc=cfg["tos_idc"],
                    timeout=600, connect_timeout=30)
PAT = cfg["tos_local_url_pattern"]


def ctype(p):
    e = os.path.splitext(p)[1].lower()
    return TYPES.get(e) or mimetypes.guess_type(p)[0] or "application/octet-stream"


def put(local, key):
    with open(local, "rb") as fh:
        data = fh.read()
    headers = {"Content-Type": ctype(local)}
    # TOS defaults to max-age=2592000. That is right for the versioned assets
    # (index.html references them as name?v=N, so a new version is a new URL),
    # but fatal for index.html itself: cached for a month, the browser never
    # sees the new ?v=N references and the whole scheme does nothing.
    if key.endswith("index.html"):
        headers["Cache-Control"] = "no-cache, must-revalidate"
    c.put_object(key, data, headers=headers)
    return len(data)


targets = []
for f in SERVE_FILES:
    p = os.path.join(ROOT, f)
    if os.path.exists(p):
        targets.append((p, PREFIX + "/" + f))
for d in SERVE_DIRS:
    base = os.path.join(ROOT, d)
    for dirpath, _, names in os.walk(base):
        for n in sorted(names):
            if n == ".DS_Store":
                continue
            p = os.path.join(dirpath, n)
            if os.path.getsize(p) == 0:
                print("  skip (empty):", p)
                continue
            rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
            targets.append((p, PREFIX + "/" + rel))

total = 0
for i, (p, k) in enumerate(targets, 1):
    n = put(p, k)
    total += n
    if i % 20 == 0 or n > 2_000_000:
        print("  %3d/%d  %8.2f MB  %s" % (i, len(targets), n / 1048576, k), flush=True)
print("site: %d objects, %.1f MB" % (len(targets), total / 1048576))

n = put(ZIP, ZIP_KEY)
print("zip : %.1f MB -> %s" % (n / 1048576, ZIP_KEY))
print()
print("site url:", PAT.format(bucket=cfg["tos_bucket"], key=PREFIX + "/index.html"))
print("zip  url:", PAT.format(bucket=cfg["tos_bucket"], key=ZIP_KEY))
