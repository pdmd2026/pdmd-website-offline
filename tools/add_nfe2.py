#!/usr/bin/env python3
"""Add the 2-NFE gallery: copy the picked clips, cut posters, write `nfe2` into data.js.

    python3 tools/add_nfe2.py [/path/to/h3_zwang027_s4000_t2v64]

Source is the t2v_64_0917 column NFE2_zwang027_s4000 (pdmd-zwang027 @ iter 4000,
2 NFE, seed 42). Re-runnable: clips and posters already on disk are kept.
"""
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/h3_zwang027_s4000_t2v64")
COLUMN = "NFE2_zwang027_s4000"
DEST = f"videos/t2v_64_0917/{COLUMN}"

# stem -> (title, kind), in display order
PICKS = [
    (1,  "Into the ice cave",      "Live action / tracking"),
    (6,  "Habitat hull",           "Orbital / close"),
    (11, "Dune road",              "Aerial / desert"),
    (14, "The sail bridge",        "Aerial / morning light"),
    (15, "Beside the humpback",    "Underwater / tracking"),
    (17, "Low-poly whale",         "Stylized 3D"),
    (21, "Bubbles in the ice",     "Frozen lake / night"),
    (24, "The harbour cat",        "Photoreal / wide"),
    (25, "Otter pilot",            "Stylized 3D / action"),
    (31, "The paper coast",        "Miniature / tabletop"),
    (33, "The viaduct",            "Mountain station terrace"),
    (36, "Mirror field",           "Solar plateau / truck"),
    (38, "Blue-hour platform",     "Mountain rail / night"),
    (39, "Polar lift-off",         "Spacecraft / ice plain"),
    (44, "The red footbridge",     "3D CG / fantasy"),
    (47, "Solar sails",            "Orbital / reveal"),
    (48, "Marble sanctuary",       "Late-afternoon / aerial"),
    (52, "Lantern-head",           "Steampunk / fog"),
    (59, "The thorned rider",      "Dark fantasy / one shot"),
    (62, "Ridge astronaut",        "Monochrome sci-fi"),
    (64, "Desert rider",           "2D anime / tracking"),
]


def prompt_of(stem):
    txt = open(os.path.join(SRC, "inputs", "t2v64", f"index_{stem:03d}", "H3_PE.txt"), encoding="utf-8").read()
    txt = txt.replace("integrated_multimodal_description:", "", 1)
    return re.sub(r"\s+", " ", txt).strip()


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *args], check=True)


def main():
    os.makedirs(os.path.join(ROOT, DEST), exist_ok=True)
    items = []
    for stem, title, kind in PICKS:
        key = f"n2_{stem}"
        rel = f"{DEST}/{stem}.mp4"
        dst = os.path.join(ROOT, rel)
        if not os.path.exists(dst):
            shutil.copy2(os.path.join(SRC, COLUMN, f"{stem}.mp4"), dst)
        # same rule as build_assets.py: the second-to-last frame is the poster
        poster = os.path.join(ROOT, "posters", f"p{key}.jpg")
        if not os.path.exists(poster):
            ff("-sseof", "-0.09", "-i", dst, "-frames:v", "1", "-vf", "scale=768:-2", "-q:v", "5", poster)
        items.append({"id": key, "title": title, "kind": kind, "src": rel,
                      "poster": f"posters/p{key}.jpg", "prompt": prompt_of(stem)})

    path = os.path.join(ROOT, "data.js")
    data = json.loads(re.match(r"^window\.PDMD\s*=\s*([\s\S]*?);?\s*$", open(path).read()).group(1))
    data["nfe2"] = items
    open(path, "w").write("window.PDMD = " + json.dumps(data) + ";\n")
    print(f"nfe2: {len(items)} clips")


if __name__ == "__main__":
    main()
