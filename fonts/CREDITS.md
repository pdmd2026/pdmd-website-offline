# Bundled fonts

Both under the SIL Open Font License 1.1, which permits redistribution and
embedding; neither requires on-screen attribution.

- **Archivo** — Omnibus-Type. Variable, width 62–125, weight 300–700.
- **IBM Plex Mono** — IBM. Weights 400 and 500.

`fonts.css` is Google Fonts' own stylesheet with the remote URLs rewritten to
these local files, one per subset, so the page renders identically with no
network call to fonts.googleapis.com. Regenerate by re-requesting that
stylesheet with a modern browser User-Agent (an older one is served TTF, not
WOFF2) and rewriting each `url()`.
