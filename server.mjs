import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const host = '127.0.0.1';
const port = Number(process.env.PORT || 8765);
const products = new Set(['VIIRS_SNPP_SP', 'VIIRS_NOAA20_SP', 'VIIRS_NOAA21_SP', 'MODIS_SP']);
const area = '75.70,30.05,76.10,30.45';
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const publicFiles = new Set(['index.html', 'agni-action-demo-fires.json', 'data-credibility.js', 'map-enhancements.js', 'map-enhancements.css', 'nasa-firms.js']);

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}

async function getFirmsCsv({ source, start, days }) {
  const key = process.env.NASA_FIRMS_API_KEY?.trim();
  if (!key) throw new Error('Add your NASA_FIRMS_API_KEY to .env, then restart the local server.');
  if (!products.has(source)) throw new Error('Choose a supported NASA FIRMS historical product.');
  if (!validDate(start) || !Number.isInteger(days) || days < 1 || days > 5) throw new Error('Each NASA FIRMS request must cover one to five valid days.');
  const url = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/' + encodeURIComponent(key) + '/' + source + '/' + area + '/' + days + '/' + start;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  const body = await response.text();
  if (!response.ok) throw new Error('NASA FIRMS returned HTTP ' + response.status + '. Check your key, product, and date range.');
  if (/^(invalid map key|map key not valid|error)/i.test(body.trim())) throw new Error('NASA FIRMS rejected the request. Check the key and date availability.');
  return body;
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', 'http://' + host + ':' + port);
    if (requestUrl.pathname === '/api/firms') {
      if (req.method !== 'GET') return send(res, 405, { error: 'Only GET is supported.' });
      const csv = await getFirmsCsv({ source: requestUrl.searchParams.get('source'), start: requestUrl.searchParams.get('start'), days: Number(requestUrl.searchParams.get('days')) });
      return send(res, 200, csv, 'text/csv; charset=utf-8');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
    const pathname = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const relative = pathname.replace(/^\/+/, '');
    if (!publicFiles.has(relative)) return send(res, 404, { error: 'Not found.' });
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) return send(res, 404, { error: 'Not found.' });
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const missing = error.code === 'ENOENT';
    send(res, missing ? 404 : 502, { error: missing ? 'File not found.' : error.message || 'NASA FIRMS request failed.' });
  }
});

server.listen(port, host, () => {
  console.log('AgniAction local server: http://' + host + ':' + port);
});
