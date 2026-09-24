# PDMD

Everything for the PDMD project page and its launch film, in one folder.

```
pdmd-website/
├── index.html          the site -- at the root, so any static host serves it
├── site.css site.js radar.js data.js
├── film.mp4            the film, 1280x720, as the page embeds it
├── posters/ strip/ logos/ fig3/
├── film/               the Remotion project the film is rendered from
├── skills/             the two skills written while building this
└── tools/              rebuild scripts + the gallery pick list
```

## Run the site

```bash
python3 tools/serve.py          # http://localhost:8000
```

Use that rather than `python3 -m http.server`. It is threaded, and that matters:
the hero filmstrip requests several short videos at once, and the single-threaded
default answers one request at a time, so every clip stalls before it paints and
the strip looks like a row of stills.

Opening `index.html` straight off disk mostly works, but some browsers refuse
`<video>` from a `file://` origin and the hash routing misbehaves.

## Host it

The site is static and every path in it is relative, so it runs from any
directory on any web server with no build step:

```bash
python3 tools/serve.py            # locally, http://localhost:8000
```

**Static host / devbox.** Copy the folder, point a server at it.

**GitHub Pages.** Push as the repo root, or as `docs/` on `main`, and turn
Pages on. `.nojekyll` is present so the `fonts/` directory is served.

**TOS.** `tools/tos_publish.py` uploads the tree and sets `Cache-Control:
no-cache` on `index.html` only. That last part matters: TOS defaults to
`max-age=2592000`, so without it a visitor keeps a month-old page and never
sees an update, however many times you republish.

### What is bundled, and what is not

Bundled, so the page renders with no third-party call: the HTML, CSS and JS,
`film.mp4`, the hero filmstrip proxies, posters, brand SVGs, Fig. 3, and the
Archivo / IBM Plex Mono webfonts under `fonts/`.

**Not bundled: the gallery and comparison clips.** Those stream from TOS at
full resolution -- `data.js` holds absolute URLs to
`tosv-sg.tiktok-row.org`. It is what keeps this folder at ~30 MB instead of
several GB, and it is the one thing that makes the site not strictly offline:
without network access to that host the gallery shows its posters and the
comparison grids stay black. Everything else works.

To cut that dependency, rehost the clips and rewrite the `src` fields in
`data.js`; nothing else refers to them.

### Bumping the cache version

`index.html` references its own assets as `name?v=N`. Raise N before each
publish or returning visitors keep the old CSS, JS and film:

```bash
python3 tools/stamp_version.py 61
```

## The film

```bash
cd film
npm install
npx remotion studio                                    # preview
npx remotion render Promo out/PDMD.mp4 --codec=h264 --crf=20 --timeout=180000
```

73 s, cut to a 90 bpm grid: the music is conformed so one beat is exactly 20
frames at 30 fps, and every sequence is placed on a whole number of beats. See
`film/README.md` for the shot list and `film/public/audio/CREDITS.md` for the
licence position -- the score is **CC BY 4.0 and requires attribution wherever
the film is published**. It is on the end card and in the site footer; keep it
there.

`film/public/clips/` holds the 1344x768 sources and is gitignored for size.
Rebuild the derived assets with `python3 tools/build_assets.py`.

## Regenerating data.js

`data.js` is generated, not written by hand. It carries three lists:

- **showcase** -- the 39 gallery clips, from `tools/picks.json`
- **compare** -- the 35 VideoGen-Eval prompts the paper selects, 8 models each
- **wan** -- the 18 augmented-VBench prompts it selects, 7 models each

The per-model checkpoints are **read from the paper's figure sources**, not
guessed from the results pages' column names. Guessing gets the baselines wrong:

| where | what it fixes |
| --- | --- |
| `pdmd/figures/src/h3_grid/README.md` | DMD† is zwang021@5500 and DMD2† is gqian153@500, not the gqian085/gqian153 columns the viewer's labels suggest |
| `pdmd/figures/wan_grid_main.tex`, `wan_grid_supp.tex` | which 18 prompts, and that both teacher columns are CFG 5 |
| `pdmd/figures/teaser.tex` | the exact seeds behind Fig. 1 -- the knockdown is seed 1673268790, not seed 0 |
| `pdmd/figures/degradation.tex` | Fig. 2 is prompt 925; the film opens on it |
| `pdmd/figures/dmd_vectors.tex` | Fig. 3, reproduced on the TL;DR section |

`tools/PICKS.txt` records how the gallery pick list decodes -- the letters are
the viewer's own column labels, not the positional order, and reading them
positionally silently points a third of them at clips that do not exist.

## Known gaps

- The hero filmstrip frames load through a small queue (four at a time). This was
  added because thirty-two simultaneous requests exhausted the per-host
  connection limit and every clip stalled. It has not been confirmed playing on a
  real host, only reasoned through and checked as far as the browser fetching them.
- The paper, code and weights buttons are placeholders.
