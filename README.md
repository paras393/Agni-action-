# AgniAction

AgniAction starts with `agni-action-demo-fires.json` and can optionally load dated historical detections through a local Node.js proxy or Netlify Function. The NASA API key stays server-side and is never put in browser JavaScript.

The included records are synthetic illustrative demo data, not NASA FIRMS observations. They remain the fallback until a user submits a NASA FIRMS request. Observation dates, season/source filters, counts, and cluster evidence are computed from the active dataset. The map does not include road/settlement context.

## Load NASA FIRMS observations

1. Request a free `MAP_KEY` from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/map_key/).
2. For local use, put the key after `NASA_FIRMS_API_KEY=` in `.env`; `.env` is excluded from Git and the local server refuses to serve it.
3. For Netlify deployment, add `NASA_FIRMS_API_KEY` under **Site configuration → Environment variables**, set its scope to **Functions** when available, and redeploy. Netlify Functions read the value server-side; it is not compiled into browser code.
4. Start local use with `node --env-file=.env server.mjs`, open `http://127.0.0.1:8765`, then choose **Connect NASA FIRMS** and select a historical satellite product and date range.

The local server and the included Netlify Function send requests to the official FIRMS Area API in five-day chunks for an approximate Sangrur pilot bounding box. The local server binds to localhost, and `.env` is excluded from Git and not served as a static file. The Netlify build copies only public app files; its function reads the secret from Netlify's server-side environment. Records replace the demo dataset only after the complete request returns detections. FIRMS requests require network access.

The app groups returned detections into proximity clusters using a 1.2 km rule. These are app-computed clusters, not NASA cluster identifiers. The locally included JSON remains illustrative and is never relabeled as NASA data.

The overview and interactive map draw at most 30 representative detection points to keep the visual layer lightweight. This is a display-only sample: filters, totals, cluster calculations, and evidence continue to use the complete active dataset. The map reports how many filtered detections are plotted.

## Run locally

Install Node.js, set `NASA_FIRMS_API_KEY` in `.env`, then run:

```sh
node --env-file=.env server.mjs
```

The local server serves the app and proxies NASA FIRMS requests without exposing the key to browser code.

## Deploy manually to Netlify without Git

1. In Netlify, create/open the site and add `NASA_FIRMS_API_KEY` under **Site configuration → Environment variables**. Make it available to Functions, then save.
2. Extract the project ZIP and open a terminal in its root folder.
3. Install/sign in to Netlify CLI if needed, then run `netlify build` followed by `netlify deploy --prod`.

The deploy command reads the publish and Functions paths from `netlify.toml`. Do not use a static-only drag-and-drop of `dist` if you need NASA FIRMS; that skips the server-side Function which protects the key.
