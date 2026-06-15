# LabOSBench Results Dashboard

Static benchmark results page for **LabOSBench**. Data-driven from `data/results.json`.

## Live demo (GitHub Pages)

After enabling Pages on the repo:

**https://su-ise-2001.github.io/LABOSBENCH/**

> GitHub cannot render interactive HTML in the file browser; use GitHub Pages or a local HTTP server.

## Enable GitHub Pages

**Option A — GitHub Actions (recommended, already configured)**

1. Repo → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Push to `main` or `labosbench-release` — workflow `.github/workflows/deploy-pages.yml` deploys the `web/` folder automatically

**Option B — Manual**

1. Settings → Pages → Deploy from branch
2. Branch: `main` (or `labosbench-release`), folder: **`/web`**

## Local preview

```bash
cd web
python -m http.server 8765
# open http://127.0.0.1:8765
```

## Update results

Edit `data/results.json`, or extract from PDF:

```bash
python scripts/extract_pdf.py papers/labosbench.pdf --text-only
```

## Structure

```
web/
├── index.html          # entry
├── .nojekyll           # skip Jekyll on GitHub Pages
├── css/style.css
├── js/app.js
├── data/results.json   # all dashboard data
├── papers/             # PDF (optional, ~15MB)
└── scripts/            # dev tools (not deployed to Pages)
```
