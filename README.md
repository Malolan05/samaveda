# Sāmaveda Archive

Static site, ready for Vercel:

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

`index.html` is the entry point. It links to:
- **gana.html** — ग्रामेगेय(वेय, प्रकृति)गानात्मकः, the Prakr̥ti-Āraṇyaka Gāna corpus (order embedded in the
  data, unchanged: Āgnēyam → Aindram → Pavamānam → Āraṇyaka Gānam → Mahānāmnyarcikam, with continuous
  global r̥k/sāman numbering already baked in).
- **suktas.html** — सूक्ततानि, standalone sūkta hymns (Puruṣasūktam, Śrīsūktam, Lakṣmīsūktam, …).

The landing page's search bar fetches both JSON files client-side and searches across them. Clicking a
result opens the matching reader with `?q=<query>` in the URL, which the reader picks up on load and
runs automatically.

## Deploy to Vercel

**CLI**
```bash
npm i -g vercel
cd this-folder
vercel        # first deploy, follow prompts (framework preset = "Other")
vercel --prod
```

**Drag and drop**
Go to https://vercel.com/new and drag this folder onto the page — no build step needed, it's static.

**Git**
Push this folder to a repo and import it in the Vercel dashboard. Leave build command empty, output directory `.`.

## Local preview
Both readers fetch JSON via relative `fetch()` calls, so opening the files directly via `file://` will be
blocked by CORS. Serve the folder locally instead:
```bash
npx serve .
# or
python3 -m http.server 8000
```
Then visit `index.html` (or `gana.html` / `suktas.html` directly).

## Updating the data

### `data/prakritiaranyakagana.json`
An array of text objects:
```json
{
  "key": "agneyam",
  "title": "...",
  "desc": "...",
  "sections": [
    { "label": "Khanda 1", "sub": "Prapāṭhaka 1 · Ardha 1", "riks": [ { "...": "...", "samaganas": [ "..." ] } ] }
  ]
}
```
Each `rik` and `samagana` carries a `global_no` — keep it continuous across all five texts if you edit entries.
The `key` must match an entry in the `TEXT_META` map near the top of `<script>` in `gana.html` (controls the
transliterated title and sidebar glyph shown for that text).

### `data/suktas.json`
Simpler, flat structure — an object with a `texts` array, each a sūkta with its verses as plain strings:
```json
{
  "texts": [
    { "title": "पुरुषसूक्तम्", "verses": [ "...", "...", "..." ] }
  ]
}
```
No numbering/metadata fields are needed per verse; `suktas.html` numbers them positionally (ऋक् 1, 2, 3…)
and derives all sidebar/stat counts directly from array lengths. Add a new sūkta by appending a new object
to `texts`; add a verse by appending a string to that sūkta's `verses` array.
