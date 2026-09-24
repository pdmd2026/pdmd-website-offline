#!/usr/bin/env python3
"""Fetch the picked clips and derive every image and proxy the site needs.

    python3 tools/build_assets.py [--workdir .cache]

Writes:  posters/p<key>.jpg   768 px preview, taken from the SECOND-TO-LAST frame
         posters/q<key>.jpg   420 px thumbnail for the hero filmstrip
         strip/<key>.mp4      480x270 proxy, ~320 KB, for the hero filmstrip

The previews come from the tail of each clip on purpose: the end state of a shot
says more about it than its first frame, and a first frame is often a fade-in.
"""
import argparse, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = imageio_ffmpeg.get_ffmpeg_exe()


def run(*args):
    return subprocess.run([FF, "-y", "-v", "error", *args], capture_output=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workdir", default=os.path.join(ROOT, ".cache"))
    a = ap.parse_args()
    os.makedirs(a.workdir, exist_ok=True)
    for d in ("posters", "strip"):
        os.makedirs(os.path.join(ROOT, d), exist_ok=True)

    picks = json.load(open(os.path.join(ROOT, "tools", "picks.json")))

    def one(key):
        src = os.path.join(a.workdir, key + ".mp4")
        if not os.path.exists(src) or os.path.getsize(src) == 0:
            subprocess.run(["curl", "-sL", "--retry", "2", "-o", src, picks[key]["url"]], check=True)
        # preview: second-to-last frame, with a wider fallback if the tail seek misses
        p = os.path.join(ROOT, "posters", f"p{key}.jpg")
        run("-sseof", "-0.09", "-i", src, "-frames:v", "1", "-vf", "scale=768:-2", "-q:v", "5", p)
        if not os.path.exists(p) or os.path.getsize(p) < 2000:
            run("-sseof", "-0.4", "-i", src, "-frames:v", "1", "-vf", "scale=768:-2", "-q:v", "5", p)
        run("-i", p, "-vf", "scale=420:-2", "-q:v", "6", os.path.join(ROOT, "posters", f"q{key}.jpg"))
        # proxy: the strip renders ~276 px wide, so it does not need the original.
        # Audio is kept -- mono at 48 kbps, ~85 KB a clip -- because the hero
        # strip unmutes whichever frame the pointer is on. It used to be built
        # with -an, which made that silently impossible.
        run("-i", src,
            "-vf", "scale=480:270:force_original_aspect_ratio=increase,crop=480:270",
            "-c:v", "libx264", "-preset", "slow", "-crf", "32", "-pix_fmt", "yuv420p",
            "-g", "48", "-c:a", "aac", "-b:a", "48k", "-ac", "1",
            "-movflags", "+faststart", os.path.join(ROOT, "strip", f"{key}.mp4"))
        return key

    with ThreadPoolExecutor(6) as ex:
        done = list(ex.map(one, sorted(picks)))
    print(f"built assets for {len(done)} clips")


if __name__ == "__main__":
    sys.exit(main())
