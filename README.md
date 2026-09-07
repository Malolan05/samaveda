# Sāmaveda · Sāma-gāna Archive

Static, dependency-free Sāmaveda archive suitable for GitHub Pages, Vercel, Netlify, or any static web host.

## Structure

- `index.html` — application shell
- `css/styles.css` — all styling
- `js/app.js` — application logic and search/navigation
- `data/samaveda.json` — human-readable Sāmaveda corpus

## Local development

Because the application loads JSON with `fetch()`, serve the directory through a local HTTP server rather than opening `index.html` directly with `file://`.

For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Vercel

No build step is required. Import the repository into Vercel and use the default static deployment settings. The site entry point is `index.html`.

The JSON corpus is loaded at runtime from `data/samaveda.json`, so it remains independently editable and version-controllable.
