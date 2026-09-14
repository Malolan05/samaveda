# Sāmaveda — React (Vite) Edition

This is a React port of the original static HTML/CSS/JS Sāmaveda reader,
preserving the exact look, features, and data-loading strategy of the
original site while restructuring it as a proper React app.

## Structure

```
src/
├── theme.css           # shared design tokens (light/dark), fonts
├── useTheme.js          # theme toggle hook (in-memory, resets to light on reload)
├── searchUtils.jsx      # normalize/highlight/snippet helpers shared by all pages
├── App.jsx              # react-router routes: / , /gana , /suktas
└── pages/
    ├── Landing.jsx + .css   # home page — universal search + corpus cards
    ├── Gana.jsx  + Reader.css  # गानम् reader (sidebar tree, weighted fuzzy search, zoom)
    └── Suktas.jsx            # सूक्ततानि reader (flat sidebar list, scored search, zoom)

public/data/
├── prakritiaranyakagana.json
└── suktas.json
```

Both JSON files are still fetched at runtime via `fetch('/data/...json')`
(same as the original), so you can edit them without rebuilding the app —
just refresh in dev, or redeploy the `public/` folder in production.

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
```

## Build & deploy

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages,
etc). A `vercel.json` is included with a SPA rewrite rule so client-side
routes (`/gana`, `/suktas`) work on a hard refresh / direct link.

## What changed vs. the original static site

- All markup/CSS/JS for each page was converted into React components with
  hooks (`useState`/`useEffect`/`useMemo`) instead of manual DOM manipulation.
- Navigation between the three "pages" is now client-side via `react-router`
  instead of separate `.html` files — `?q=` deep-linking from the landing
  page's search still works the same way.
- Search, highlighting, zoom, theme toggle, sidebar tree, and scroll-spy
  behavior were all preserved faithfully from the original implementation.
- Theme and zoom remain session-only (in-memory React state), matching the
  original's deliberate choice not to persist them via localStorage.
