# AGENTS.md

## Cursor Cloud specific instructions

This is a **purely static website** (vanilla HTML/CSS/JS) with no build step, no package manager, no dependencies, and no backend. Deployed to Cloudflare Pages via `wrangler.toml`.

### Running the dev server

```
python3 -m http.server 8080 --directory /workspace
```

Open `http://localhost:8080` in Chrome. All pages are navigable from the homepage.

### Key structure

- `index.html` — homepage
- `visualizations.html` — visualization index
- `apps/mean-sd/` — Mean & Standard Deviation exercises (Galton Board, Normal/Lognormal Distribution, Parametric Tests)
- `apps/roc-auc/` — ROC & AUC exercises (Confusion Matrix, FPR/FNR, ROC Curve, Threshold Slider, AUC)

### Lint / Test / Build

- **No linter, test framework, or build system** is configured in this repository.
- **No `package.json`** — there are no npm/yarn/pnpm dependencies.
- To validate changes, serve the site locally and test interactively in the browser.
