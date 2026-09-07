# Sāmaveda Sāma-gāna Archive

Static site, ready for Vercel:

```
.
├── index.html         # the app (UI, styling, search, all logic)
├── data/
│   └── samaveda.json  # all five texts, fetched at runtime via /data/samaveda.json
└── vercel.json        # optional — Content-Type/cache header for the JSON
```

Order embedded in the data (unchanged): Āgnēyam → Aindram → Pavamānam → Āraṇyaka Gānam → Mahānāmnyarcikam,
with continuous global r̥k/sāman numbering already baked in.

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
`index.html` fetches `/data/samaveda.json`, so opening it directly via `file://` will be blocked by CORS.
Serve it locally instead, from this folder:
```bash
npx serve .
# or
python3 -m http.server 8000
```

## Updating the data
`data/samaveda.json` is an array of five text objects:
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
