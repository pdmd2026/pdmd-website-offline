#!/usr/bin/env python3
"""Build a fully offline copy of the site: every clip on disk, no remote URLs.

    python3 tools/bundle_offline.py [outdir]

The published site streams the gallery and comparison clips from TOS, which
keeps it at ~42 MB. That is the right trade for a hosted page and the wrong one
for handing someone a folder, so this writes a second tree with the ~520 MB of
video alongside and `data.js` rewritten to relative paths. Nothing in it
reaches the network.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# everything the page needs, minus the film project (sources, not deliverables)
COPY = ["index.html", "site.css", "site.js", "radar.js", "film.mp4", ".nojekyll",
        "README.md", ".gitignore"]
COPY_DIRS = ["posters", "strip", "logos", "fig3", "fonts", "skills", "tools"]


def local_path(url):
    """.../results/citai_t2v/NFE4_x_seed0/80.mp4 -> videos/citai_t2v/NFE4_x_seed0/80.mp4

    Three segments, not two: column names repeat across benchmarks and two
    segments collided."""
    return "videos/" + "/".join(url.split("/")[-3:])


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "pdmd-website-offline")
    out = os.path.abspath(out)
    src = re.match(r"^window\.PDMD\s*=\s*([\s\S]*?);?\s*$", open(os.path.join(ROOT, "data.js")).read())
    data = json.loads(src.group(1))

    jobs = {}
    def claim(d):
        if isinstance(d, list):
            return [claim(x) for x in d]
        if isinstance(d, dict):
            if isinstance(d.get("src"), str) and d["src"].startswith("http"):
                p = local_path(d["src"])
                jobs[p] = d["src"]
                d["src"] = p
            for v in d.values():
                claim(v)
        return d
    claim(data)

    print(f"{len(jobs)} clips -> {out}")
    # Re-runnable on purpose: the code and assets are refreshed every time, the
    # 520 MB of video is kept. Wiping the tree first would mean re-downloading
    # all of it to change one line of CSS.
    os.makedirs(out, exist_ok=True)
    for f in COPY:
        s = os.path.join(ROOT, f)
        if os.path.exists(s):
            shutil.copy2(s, os.path.join(out, f))
    for d in COPY_DIRS:
        s = os.path.join(ROOT, d)
        if os.path.isdir(s):
            shutil.copytree(s, os.path.join(out, d), dirs_exist_ok=True)
    open(os.path.join(out, "data.js"), "w").write("window.PDMD = " + json.dumps(data) + ";\n")

    def get(item):
        rel, url = item
        dst = os.path.join(out, rel)
        if os.path.exists(dst) and os.path.getsize(dst) > 0:
            return rel, True, os.path.getsize(dst)          # already have it
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        r = subprocess.run(["curl", "-sL", "--retry", "3", "-m", "600", "-o", dst, url])
        ok = r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 0
        return rel, ok, (os.path.getsize(dst) if ok else 0)

    done = fail = total = 0
    with ThreadPoolExecutor(12) as ex:
        for rel, ok, n in ex.map(get, jobs.items()):
            done += 1
            total += n
            if not ok:
                fail += 1
                print("  FAILED", rel)
            if done % 40 == 0:
                print(f"  {done}/{len(jobs)}  {total/1048576:.0f} MB", flush=True)
    print(f"{done} present, {fail} failed, {total/1048576:.0f} MB of video")

    # prompts get removed from the site over time; drop their clips too
    keep = {os.path.join(out, k) for k in jobs}
    stale = []
    for dirpath, _, names in os.walk(os.path.join(out, "videos")):
        for n in names:
            p = os.path.join(dirpath, n)
            if p not in keep:
                stale.append(p)
    for p in stale:
        os.remove(p)
    if stale:
        print(f"removed {len(stale)} clip(s) no longer referenced")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
