const products = new Set(['VIIRS_SNPP_SP', 'VIIRS_NOAA20_SP', 'VIIRS_NOAA21_SP', 'MODIS_SP']);
const area = '75.70,30.05,76.10,30.45';

function jsonError(status, error) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}

export default async function handler(request) {
  if (request.method !== 'GET') return jsonError(405, 'Only GET is supported.');
  const key = process.env.NASA_FIRMS_API_KEY?.trim();
  if (!key) return jsonError(503, 'NASA FIRMS is not configured for this deployment. Add NASA_FIRMS_API_KEY to the host environment variables and redeploy.');

  const url = new URL(request.url);
  const source = url.searchParams.get('source');
  const start = url.searchParams.get('start');
  const days = Number(url.searchParams.get('days'));
  if (!products.has(source)) return jsonError(400, 'Choose a supported NASA FIRMS historical product.');
  if (!validDate(start) || !Number.isInteger(days) || days < 1 || days > 5) return jsonError(400, 'Each NASA FIRMS request must cover one to five valid days.');

  const endpoint = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/' + encodeURIComponent(key) + '/' + source + '/' + area + '/' + days + '/' + start;
  try {
    const upstream = await fetch(endpoint, { signal: AbortSignal.timeout(25000), cache: 'no-store' });
    const csv = await upstream.text();
    if (!upstream.ok) return jsonError(502, 'NASA FIRMS returned HTTP ' + upstream.status + '. Check the key, product, and date availability.');
    if (/^(invalid map key|map key not valid|error)/i.test(csv.trim())) return jsonError(502, 'NASA FIRMS rejected the request. Check the key and date availability.');
    return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return jsonError(502, 'Could not reach NASA FIRMS. Check network access and try again.');
  }
}
