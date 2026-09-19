# Sāmaveda Archive

A static, no-build-step website for reading the Sāmaveda: a landing page with a
cross-corpus search, and two dedicated readers — one for the gāna (sung
melodic) corpus, one for standalone sūkta hymns. Everything is plain HTML/CSS/
JS; there is no framework, bundler, package.json, or server-side code anywhere
in this project.

```
.
├── index.html         # landing page — corpus cards + universal search across both files
├── gana.html          # reader for the gāna corpus (UI, styling, search, all logic)
├── suktas.html        # reader for the sūkta corpus (UI, styling, search, all logic)
├── data/
│   ├── prakritiaranyakagana.json   # gāna corpus, fetched at runtime via data/prakritiaranyakagana.json
│   └── suktas.json                 # sūkta corpus, fetched at runtime via data/suktas.json
└── vercel.json        # optional — Content-Type/cache header for the JSON
```

Nothing in `data/` is inlined into the HTML. All three pages `fetch()` their
JSON at runtime (with `cache: 'no-cache'`, so edits to the data show up on a
plain reload, no cache-busting needed), which means:

* You can edit the `.json` files without touching any HTML/JS.
* The pages must be served over `http(s)`. Opening a file directly via
  `file://` will make the browser block the `fetch()` call (see
  [Local preview](#local-preview) below).

---

## Table of contents

* [Site map](#site-map)
* [How the three pages relate](#how-the-three-pages-relate)
* [Design system](#design-system)
* [Search, in detail](#search-in-detail)
* [Deploy to Vercel](#deploy-to-vercel)
* [Local preview](#local-preview)
* [Updating the data](#updating-the-data)

  * [`data/prakritiaranyakagana.json`](#dataprakritiaranyakaganajson)
  * [`data/suktas.json`](#datasuktasjson)
* [File-by-file reference](#file-by-file-reference)
* [Browser support & known limitations](#browser-support--known-limitations)
* [Troubleshooting](#troubleshooting)
* [Extending the site](#extending-the-site)

---

## Site map

| Page          | Purpose                                                                                                | Data source                                                       | Route param                            |
| ------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------- |
| `index.html`  | Landing page: hero, universal search, two corpus cards                                                 | fetches **both** JSON files (read-only, for search + stat counts) | —                                      |
| `gana.html`   | Full reader for the gāna corpus: sidebar tree (text → section → r̥k), verse cards, attached sāma-gānas | `data/prakritiaranyakagana.json`                                  | `?q=<term>` auto-runs a search on load |
| `suktas.html` | Full reader for the sūkta corpus: sidebar list of sūktas, verse cards                                  | `data/suktas.json`                                                | `?q=<term>` auto-runs a search on load |

`index.html` is the entry point and the only page meant to be linked from
outside the site. It links to:

* **gana.html** — ग्रामेगेय(वेय, प्रकृति)गानात्मकः, the Prakr̥ti-Āraṇyaka Gāna
  corpus. The order embedded in the data is unchanged: Āgnēyam → Aindram →
  Pavamānam → Āraṇyaka Gānam → Mahānāmnyarcikam, with continuous global
  r̥k/sāman numbering already baked into the JSON (`global_no` fields).
* **suktas.html** — सूक्ततानि, standalone sūkta hymns (Puruṣasūktam,
  Śrīsūktam, Lakṣmīsūktam, and any others added to the file).

## How the three pages relate

`gana.html` and `suktas.html` are fully independent apps — each fetches only
its own JSON, builds its own sidebar, and runs its own search. Neither one
knows the other exists, apart from a "back to home" link in the sidebar brand
that points at `index.html`.

`index.html` is the only page that talks to *both* data files. On load it
fetches `prakritiaranyakagana.json` and `suktas.json` in parallel, purely to:

1. Populate the small stat lines on each corpus card (text/r̥k/sāman counts,
   sūkta/verse counts).
2. Power the universal search box, which needs both datasets in memory to
   search across them at once.

The landing page never renders full verses inline — search results there are
short highlighted snippets. Clicking a result (or a "see all matches in …"
link) navigates to `gana.html?q=<query>` or `suktas.html?q=<query>`; each
reader reads `?q=` off `location.search` on `init()` and immediately runs
that query through its own (page-local) search index, landing the visitor on
a fully-rendered results view rather than an empty reader.

This means the two readers are the source of truth for search **behavior**
(highlighting, ranking, AND-of-terms matching), and the landing page's own
search implementation is a lighter-weight, best-effort preview of the same
idea — it does not need to stay byte-for-byte identical to the readers'
search logic, but it should stay behaviorally consistent (same accent-
stripping, same "all terms must match" rule) so a query that finds N results
on the landing page doesn't surprise the user with 0 results after the
redirect.

## Design system

All three pages share one token-based design system, defined as CSS custom
properties on `:root` and overridden wholesale on `html[data-theme="dark"]`.
Because every rule in the stylesheets references `var(--token)` rather than a
literal color, dark mode is implemented by flipping a single `data-theme`
attribute on `<html>` — no per-component dark-mode overrides are needed
except for a couple of text-on-accent-background cases (`.rik-no-badge`,
`.verse-no-badge`, `mark`) where the accent color itself gets lighter in dark
mode and the text sitting on top of it has to flip from light to dark to stay
readable.

Key tokens (light values shown; see `html[data-theme="dark"]` for the dark
equivalents):

| Token                      | Role                                              |
| -------------------------- | ------------------------------------------------- |
| `--bg` / `--bg-soft`       | page background / topbar background               |
| `--panel` / `--panel-2`    | card and input surfaces / their hover state       |
| `--line` / `--line-soft`   | primary borders / faint nested-tree borders       |
| `--ember` / `--ember-soft` | primary accent — active states, links, highlights |
| `--gold`                   | secondary accent — stat numbers, small labels     |
| `--ash` / `--ash-dim`      | mid-tone / muted body text                        |
| `--paper` / `--paper-dim`  | strongest text (headings) / body text             |
| `--radius`                 | shared corner radius for small controls (`3px`)   |

Fonts (loaded from Google Fonts, `preconnect`-ed for speed):

* `Noto Serif` is the site-wide primary typeface across all three HTML pages:
  headings, brand wordmarks, body text, buttons, labels, search inputs,
  navigation, and other UI controls.
* `Noto Serif Devanagari` is loaded alongside it as the Devanagari-specific
  fallback, ensuring Sanskrit/Devanagari text remains properly shaped and
  readable, including verse text, sāma-gāna text, brand marks, pada-pāṭha,
  and metadata.
* The previous Fraunces, Inter, and Noto Sans Devanagari font roles have been
  removed; there is no separate sans-serif UI typeface.

Both readers additionally expose a `--zoom` custom property (0.6–2.0,
adjusted via the +/− buttons in the topbar), which every Sanskrit-text
`font-size` is expressed relative to via `calc(Npx * var(--zoom, 1))`. This is
the only piece of user-adjustable state that isn't reset on reload — it's
deliberately kept in memory only (a plain JS variable), matching the theme
toggle, which also always starts back at light mode on a fresh load rather
than persisting via `localStorage`.

Responsive behavior: below 720px, the sidebar in `gana.html`/`suktas.html`
switches from "pushes content over" to a fixed-position overlay drawer (with
a dark scrim behind it), and several paddings/font-sizes shrink further below
420px. The landing page's card grid collapses from two columns to one below
680px.

## Search, in detail

There are, in effect, three separate search implementations in this project
— one per page — because each page's data shape is different enough that
sharing one generic search function would obscure more than it'd save. They
all follow the same core algorithm, though:

1. **Normalize.** Strip Vedic accent/svara marks (the combining characters
   `꣡ ꣢ ꣣ ꣥ ꣯ ᳐ ᳒`) and collapse whitespace, so a search for plain
   consonant/vowel text matches accented verse text regardless of which
   svara marks are present. See `normalize()` in each page's `<script>`.
2. **Split into terms.** The query is lowercased and split on whitespace;
   every term must match *somewhere* in a candidate record (an AND across
   terms, not OR) or that record is excluded entirely.
3. **Score and rank.** `gana.html`'s search (the most elaborate of the
   three) weights matches by field — e.g. a hit in the r̥k's own samhitā
   text outranks a hit only in a sāma-gāna's notes — via the
   `FIELD_WEIGHT`/`scoreEntry()` machinery, and tracks *which* attached
   sāma-gāna(s) matched so the UI can visually dim siblings that didn't
   match (`.sg-dim` / `.sg-match`). `suktas.html`'s search is simpler
   (verse text + parent sūkta title, flat score), reflecting the flatter
   data shape. The landing page's search is simpler still (existence
   check, not full scoring) since it only needs to produce a handful of
   representative snippets, not a definitively ranked full result set.
4. **Highlight.** Every matched term is wrapped in `<mark>` in the rendered
   output, via a regex built per-term with special characters escaped.
5. **Debounce.** All three search inputs debounce keystrokes by 160ms
   before re-running the search, so typing doesn't re-score the entire
   dataset on every keypress.

Cross-linking: `index.html`'s search results link to
`gana.html?q=<encodeURIComponent(query)>` or
`suktas.html?q=<encodeURIComponent(query)>`. Each reader's `init()` reads
`?q=` via `new URLSearchParams(location.search)` once its own data has
loaded, populates its search input, and calls its own `runGlobalSearch()`
immediately — so the visitor lands on a fully-searched, fully-highlighted
view rather than the default unfiltered reader.

There is intentionally no search-index caching or persistence between page
loads or between pages: each page fetches its own JSON fresh and rebuilds
its in-memory search structures every time. For the current dataset sizes
this is fast enough to not need debouncing beyond the 160ms keystroke delay;
if the corpora grow dramatically, see [Extending the site](#extending-the-site).

## Deploy to Vercel

**CLI**

```bash
npm i -g vercel
cd this-folder
vercel        # first deploy, follow prompts (framework preset = "Other")
vercel --prod
```

**Drag and drop**
Go to https://vercel.com/new and drag this folder onto the page — no build
step needed, it's static.

**Git**
Push this folder to a repo and import it in the Vercel dashboard. Leave the
build command empty and the output directory as `.`.

`vercel.json` (optional) is only there to set `Content-Type`/cache headers on
the JSON files; the site works without it, since Vercel serves static `.json`
files with a correct content type by default. Add caching headers there if
you want the JSON to be cached more or less aggressively at the edge than
Vercel's default for static assets.

## Local preview

All three pages fetch JSON via relative `fetch()` calls (`data/…json`), so
opening any of them directly via `file://` will be blocked by the browser's
CORS/fetch-from-file restrictions — you'll see the pages' own built-in error
state (a message plus a link back to `index.html`) rather than a working
reader. Serve the folder locally instead, from this folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then visit `index.html` (or `gana.html` / `suktas.html` directly — both
also work as standalone entry points if you already know which corpus you
want).

## Updating the data

Both JSON files are plain data — no build step regenerates anything from
them, and no schema is enforced beyond what each page's rendering code reads.
Malformed or missing fields generally degrade gracefully (a missing optional
field is just omitted from the rendered card) rather than crashing the page,
but keep an eye on brackets/commas since these are hand-editable files.

### `data/prakritiaranyakagana.json`

An array of text objects:

```json
[
  {
    "key": "agneyam",
    "title": "...",
    "desc": "...",
    "sections": [
      {
        "label": "Khanda 1",
        "sub": "Prapāṭhaka 1 · Ardha 1",
        "riks": [
          {
            "rik_no": "1",
            "global_no": 1,
            "prapathaka": "...",
            "ardha": "...",
            "khanda": "...",
            "rishi": "...",
            "chandas": "...",
            "devata": "...",
            "ref": "...",
            "samhita": "...",
            "pada": "...",
            "notes": "...",
            "samaganas": [
              {
                "no": "1",
                "global_no": 1,
                "rishi": "...",
                "chandas": "...",
                "devata": "...",
                "ref": "...",
                "text": "...",
                "notes": "..."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

Notes on individual fields:

* **`key`** must match an entry in the `TEXT_META` map near the top of
  `gana.html`'s `<script>`:

  ```js
  const TEXT_META = {
    agneyam:   { translit: "Āgnēyam",           idx:"अ" },
    aindram:   { translit: "Aindram",           idx:"ऐ" },
    pavamanam: { translit: "Pavamānam",         idx:"प" },
    aranyaka:  { translit: "Āraṇyaka Gānam",    idx:"आ" },
    mahamnaya: { translit: "Mahānāmnyarcikam",  idx:"म" },
  };
  ```

  This controls the transliterated title and the single-glyph sidebar index
  shown for that text. If you add a sixth text with a new `key`, add a
  corresponding entry here or it will fall back to the raw `title`/`?`.
* **`global_no`** (on both `rik` and `samagana` objects) powers the
  "R̥k №N of TOTAL" / "Sāman №N of TOTAL" badges, which are computed against
  `TOTAL_RIKS`/`TOTAL_SAMANS` (summed once at load time across *all* texts).
  Keep numbering continuous and non-overlapping across all five (or more)
  texts if you insert or reorder entries — the page does not recompute or
  validate this for you. The landing page's own stat counts are unaffected
  by this — they're derived live from `sections[].riks.length` and
  `sections[].riks[].samaganas.length`, so they'll always match the data
  even if `global_no` numbering has drifted; but the *badges inside*
  `gana.html`'s reader view will be wrong if `global_no` isn't kept
  continuous.
* **`prapathaka` / `ardha` / `khanda` / `rishi` / `chandas` / `devata` /
  `ref`** are all optional metadata tags rendered as small pills above the
  verse text (`renderRikMeta()`); omit any that don't apply to a given r̥k.
* **`samhita`** is the accented Devanagari verse text (large font). **`pada`**
  is the word-by-word pada-pāṭha rendering (smaller, indented, left-bordered).
  **`notes`** is free-text, rendered in italics below the verse.
* **`samaganas`** is an array (can be empty) — a single r̥k can have more
  than one attached sāma-gāna (sung version); each renders as its own small
  card beneath the verse, numbered by its own `no` field.

### `data/suktas.json`

A much flatter structure — an object with a `texts` array, each entry a
sūkta with its verses as plain strings:

```json
{
  "texts": [
    {
      "title": "पुरुषसूक्तम्",
      "verses": [
        "पहला ऋक् का पूरा accented text यहाँ …",
        "दूसरा ऋक् …"
      ]
    },
    {
      "title": "लक्ष्मीसूक्तम्",
      "verses": [ "..." ]
    }
  ]
}
```

* No numbering or metadata fields are needed per verse — `suktas.html`
  numbers them positionally (ऋक् 1, 2, 3…, i.e. `index + 1` in the `verses`
  array) and derives all sidebar/footer stat counts (`N sūktas · M ऋचः`)
  directly from array lengths at load time. There's no `global_no`
  equivalent here since sūktas are treated as independent hymns rather than
  one continuously-numbered corpus.
* To add a new sūkta: append a new `{ "title": ..., "verses": [...] }`
  object to the `texts` array.
* To add a verse to an existing sūkta: append a new string to that sūkta's
  `verses` array. No other file needs to change — the sidebar count, the
  reader's verse cards, and the landing page's stat line and search index
  all pick it up automatically on next load.
* Keep each verse as a single string (embed internal punctuation/line-break
  markers as you already do, e.g. `॥`, `।`) — the renderer does not split a
  verse string into sub-parts.

## File-by-file reference

* **`index.html`** — self-contained: a `<style>` block with the design
  tokens described above, then a `<script>` that (a) toggles `data-theme`,
  (b) fetches both JSON files and populates the two card stat lines, (c)
  implements the universal search box (`runSearch()`, `matchGana()`,
  `matchSuktas()`, `snippet()`), and (d) has no sidebar/tree logic since the
  landing page has no navigable content of its own beyond the two cards.
* **`gana.html`** — the largest file. Structure: `<style>` (design tokens +
  every component's CSS — sidebar tree, topbar, r̥k cards, sāma-gāna cards,
  search-result notes, mobile breakpoints), then `<body>` markup for the
  two-pane app shell (`.sidebar` / `.main`), then a `<script>` containing:
  theme toggle, `TEXT_META`, sidebar tree builder (`buildTree()`), r̥k
  rendering (`renderRik()`, `renderRikMeta()`), the flat search index
  (`buildSearchIndex()`) and scorer (`scoreEntry()`, `buildFuzzyRegex()`,
  `highlightMatches()`), zoom controls, scroll-spy (keeps the sidebar and
  breadcrumb in sync with what's on screen while scrolling), and `init()`
  (fetch → build tree/index → initial render → pick up `?q=`).
* **`suktas.html`** — a lighter-weight sibling of `gana.html` built for the
  flatter sūkta data shape: sidebar is a flat list of sūktas (no
  text→section→rik tree), search is a single-pass scorer over verse text +
  parent title (no per-field weighting, no attached-sub-item highlighting
  since sūktas have no equivalent of sāma-gānas), otherwise mirrors
  `gana.html`'s theme toggle, zoom, scroll-spy, and `?q=` pickup.
* **`data/prakritiaranyakagana.json`** / **`data/suktas.json`** — see
  [Updating the data](#updating-the-data).
* **`vercel.json`** — optional static-hosting config (headers only; no
  routing or build config needed since there's nothing to build).

## Browser support & known limitations

* Requires a browser with `fetch()`, CSS custom properties, and
  `String.prototype.normalize('NFC')` support — i.e. any evergreen browser
  (Chrome/Edge/Firefox/Safari, recent versions). No transpilation or
  polyfills are included.
* No offline/service-worker support — every page load re-fetches its JSON.
* No `localStorage`/`sessionStorage` usage anywhere (theme and zoom are
  intentionally session-only, resetting on reload).
* Devanagari rendering quality (conjuncts, mātrā placement, Vedic accent
  glyphs) depends on the fonts actually available/rendering correctly in the
  visitor's browser. `Noto Serif Devanagari` is loaded as the primary
  Devanagari fallback, but very old or headless browsers may render some
  Vedic accent marks (`꣡ ꣢ ꣣` etc.) as tofu boxes.
* The landing page's universal search is a best-effort preview, not a
  byte-for-byte reproduction of each reader's own (more heavily weighted)
  scoring — see [Search, in detail](#search-in-detail).

## Troubleshooting

* **"Could not load … .json" error state on any page** — you're most likely
  opening the file via `file://` (blocked by the browser) instead of
  serving it over `http(s)`, or the JSON file isn't present at the expected
  `data/…json` path relative to the HTML file. See
  [Local preview](#local-preview).
* **A r̥k's "R̥k №N of TOTAL" badge looks wrong** — check that `global_no`
  values in `prakritiaranyakagana.json` are unique and continuous across
  *all* texts, not just within one text/section.
* **New sūkta/text doesn't show up in the sidebar** — hard-refresh
  (`fetch` already uses `cache: 'no-cache'`, so this is usually a JSON
  syntax error rather than a caching issue; validate the file with any
  JSON linter, or just `JSON.parse()` it in a browser console).
* **Search finds a verse on the landing page but 0 results after clicking
  through** — normalization differs (e.g. a term only matches a field the
  landing page checks but the reader's scorer doesn't, or vice versa); see
  [Search, in detail](#search-in-detail) for exactly which fields each
  page's search covers.

## Extending the site

Some natural next steps if you want to build on this:

* **A third corpus**: duplicate `suktas.html` as a starting point (it's the
  simpler of the two readers), point it at a new `data/*.json` file, add a
  third card to `index.html`, and extend the landing page's `loadData()` /
  `runSearch()` to fetch and search the new file too.
* **Persisting theme/zoom** across visits: swap the in-memory `currentTheme`
  /`zoom` variables for `localStorage` reads/writes in each page's theme-
  toggle and zoom-button handlers.
* **Shareable deep links** into a specific r̥k or sūkta verse (not just a
  search query): each verse/r̥k card already has a stable `id` attribute
  (`rik-${ti}-${si}-${ri}` in `gana.html`, `v-${ti}-${vi}` in `suktas.html`),
  so a `#hash`-based scroll-to-and-highlight on load would be a small
  addition to each page's `init()`.
