#!/usr/bin/env python3
"""Stamp a cache-busting version onto every local asset the page references.

    python3 tools/stamp_version.py 29

TOS serves `cache-control: max-age=2592000` -- thirty days -- and sends no
way to revalidate. A visitor who has loaded the page once keeps the old
site.css, site.js, data.js and film.mp4 for a month, however many times we
republish. Changing the query string changes the URL, which is the only
lever we have from this side.

Run it before every publish, with a number that goes up.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ["site.css", "site.js", "radar.js", "data.js", "film.mp4", "posters/film.jpg"]


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].isdigit():
        print(__doc__)
        return 64
    ver = sys.argv[1]
    html = (ROOT / "index.html").read_text()
    total = 0
    for a in ASSETS:
        # match the asset with or without an existing ?v=NN, inside quotes
        pat = re.compile(r'(["\'])' + re.escape(a) + r'(?:\?v=\d+)?\1')
        html, n = pat.subn(lambda m: f'{m.group(1)}{a}?v={ver}{m.group(1)}', html)
        total += n
        print(f"  {a:20s} {n} reference(s)")
    (ROOT / "index.html").write_text(html)
    print(f"stamped v={ver} on {total} references")
    return 0


if __name__ == "__main__":
    sys.exit(main())
