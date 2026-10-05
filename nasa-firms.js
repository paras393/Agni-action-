/* On-demand NASA FIRMS historical data connection through the local server proxy. */
(function () {
  const bbox = '75.70,30.05,76.10,30.45'; // Approximate Sangrur pilot extent, not district boundary.
  const minDistanceKm = 1.2;
  const sourceNames = {
    VIIRS_SNPP_NRT: 'VIIRS Suomi NPP Near Real-Time',
    VIIRS_NOAA20_NRT: 'VIIRS NOAA-20 Near Real-Time',
    VIIRS_NOAA21_NRT: 'VIIRS NOAA-21 Near Real-Time',
    VIIRS_SNPP_SP: 'VIIRS Suomi NPP Standard Processing',
    VIIRS_NOAA20_SP: 'VIIRS NOAA-20 Standard Processing',
    VIIRS_NOAA21_SP: 'VIIRS NOAA-21 Standard Processing',
    MODIS_SP: 'MODIS Standard Processing'
  };
  const keyForm = `
    <div class="eyebrow">DATE & SATELLITE EXPLORER</div>
    <h2>Explore fire points by time</h2>
    <p>Choose a satellite product and date range to compare fire detections from different times in the Sangrur pilot area. NASA data loads with the access already configured for this app; you do not need to enter or connect a key.</p>
    <div class="firms-fields">
    <label class="firms-label">Satellite product<select class="control" id="firmsSource"><option value="VIIRS_NOAA21_NRT">VIIRS NOAA-21 · near-real-time</option><option value="VIIRS_NOAA20_NRT">VIIRS NOAA-20 · near-real-time</option><option value="VIIRS_SNPP_NRT">VIIRS Suomi NPP · near-real-time</option><option value="VIIRS_SNPP_SP">VIIRS Suomi NPP · historical</option><option value="VIIRS_NOAA20_SP">VIIRS NOAA-20 · historical</option><option value="VIIRS_NOAA21_SP">VIIRS NOAA-21 · historical</option><option value="MODIS_SP">MODIS · historical</option></select></label>
    <label class="firms-label">From<input class="control" id="firmsFrom" type="date"></label>
    <label class="firms-label">Through<input class="control" id="firmsThrough" type="date"></label>
    </div>
    <p class="firms-disclaimer">This app uses its configured NASA access automatically. If NASA cannot be reached, a clearly labelled local fallback remains active.</p>
    <div id="firmsStatus" role="status" aria-live="polite"></div>
    <div class="story-buttons"><button class="back" id="firmsCancel" type="button">Cancel</button><button class="primary" id="firmsLoad" type="button">Show selected detections</button></div>`;

  function csvRows(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); if (row.some(value => value !== '')) rows.push(row);
        row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    if (rows.length < 2) return [];
    const headers = rows.shift().map(value => value.trim());
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, (values[index] || '').trim()])));
  }

  function normalizeConfidence(value) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    return ({ l: 35, n: 65, h: 90 }[(value || '').toLowerCase()] || 50);
  }

  function prepareClusters(records) {
    const parent = records.map((_, index) => index);
    const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
    const join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
    const toRadians = degrees => degrees * Math.PI / 180;
    // Sangrur is near 30°N; 90 km/degree is conservative for both axes.
    const cells = new Map(), cellSize = minDistanceKm / 90;
    const cellFor = record => [Math.floor(record.latitude / cellSize), Math.floor(record.longitude / cellSize)];
    records.forEach((record, index) => {
      const [latCell, lonCell] = cellFor(record);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nearby = cells.get((latCell + dy) + ':' + (lonCell + dx)) || [];
        nearby.forEach(otherIndex => {
          const other = records[otherIndex];
          const dLat = toRadians(record.latitude - other.latitude);
          const dLon = toRadians(record.longitude - other.longitude);
          const meanLat = toRadians((record.latitude + other.latitude) / 2);
          const distance = 6371 * Math.sqrt(dLat * dLat + Math.cos(meanLat) ** 2 * dLon * dLon);
          if (distance <= minDistanceKm) join(index, otherIndex);
        });
      }
      const key = latCell + ':' + lonCell;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(index);
    });
    const groups = new Map();
    records.forEach((record, index) => {
      const root = find(index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(record);
    });
    const sorted = [...groups.values()].sort((a, b) => {
      const alat = a.reduce((sum, row) => sum + row.latitude, 0) / a.length;
      const blat = b.reduce((sum, row) => sum + row.latitude, 0) / b.length;
      return blat - alat;
    });
    sorted.forEach((group, index) => {
      const id = 'F' + String(index + 1).padStart(3, '0');
      const name = 'Sangrur hotspot cluster ' + (index + 1);
      group.forEach(record => { record.cluster_id = id; record.cluster_name = name; });
    });
  }

  function normalizeRow(row, source, index) {
    const latitude = Number(row.latitude), longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !row.acq_date) return null;
    const satellite = row.satellite || (source.startsWith('MODIS') ? 'MODIS' : source.includes('NOAA20') ? 'NOAA-20' : source.includes('NOAA21') ? 'NOAA-21' : 'Suomi NPP');
    return {
      id: 'firms-' + row.acq_date + '-' + row.acq_time + '-' + index,
      latitude, longitude, acq_date: row.acq_date, season: row.acq_date.slice(0, 4),
      satellite, confidence: normalizeConfidence(row.confidence), frp: Number(row.frp) || 0,
      source: 'NASA FIRMS · ' + source, instrument: row.instrument || '',
      acq_time: row.acq_time || '', daynight: row.daynight || '',
      bright_ti4: row.bright_ti4 || '', bright_ti5: row.bright_ti5 || '', version: row.version || ''
    };
  }

  async function loadNasaData(options = {}) {
    const liveRange = options.auto ? defaultLiveRange() : null;
    const start = options.start || document.getElementById('firmsFrom')?.value || liveRange.start;
    const end = options.end || document.getElementById('firmsThrough')?.value || liveRange.end;
    const source = options.source || document.getElementById('firmsSource')?.value || 'VIIRS_NOAA21_NRT';
    const status = document.getElementById('firmsStatus');
    const button = document.getElementById('firmsLoad');
    const setStatus = message => { if (status) status.textContent = message; };
    if (!start || !end || start > end) { setStatus('Choose a valid date range.'); return; }
    const dayCount = Math.floor((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1;
    if (dayCount > 800) { setStatus('Choose a range of 800 days or less to keep requests manageable.'); return; }
    if (button) button.disabled = true;
    const records = [];
    try {
      let cursor = Date.parse(start + 'T00:00:00Z'), last = Date.parse(end + 'T00:00:00Z');
      let requestNumber = 0;
      while (cursor <= last) {
        const days = Math.min(5, Math.floor((last - cursor) / 86400000) + 1);
        const date = new Date(cursor).toISOString().slice(0, 10);
        requestNumber++;
        setStatus('Requesting NASA FIRMS detections · ' + date + ' · chunk ' + requestNumber + '…');
        const params = new URLSearchParams({ source, start: date, days: String(days) });
        const response = await fetch('/api/firms?' + params.toString(), { cache: 'no-store' });
        const text = await response.text();
        if (!response.ok) {
          let message = 'NASA FIRMS request failed with HTTP ' + response.status + '.';
          try { message = JSON.parse(text).error || message; } catch (_) {}
          throw new Error(message);
        }
        if (/^invalid map key|map key not valid|error/i.test(text.trim())) throw new Error('NASA FIRMS did not accept this MAP_KEY or request.');
        csvRows(text).forEach(row => { const record = normalizeRow(row, source, records.length); if (record) records.push(record); });
        cursor += days * 86400000;
      }
      if (!records.length && options.auto && source.endsWith('_NRT')) {
        return loadNasaData({ auto: true, source: 'VIIRS_SNPP_SP', start: '2022-11-01', end: '2022-11-01' });
      }
      if (!records.length) throw new Error('NASA returned no detections for this product, date range, and pilot extent. Your local illustrative data is still active.');
      prepareClusters(records);
      const dataset = {
        dataset_status: 'nasa_firms', dataset_date: new Date().toISOString(),
        data_source: 'NASA FIRMS Area API', product: source, product_name: sourceNames[source],
        area: 'Approximate Sangrur pilot bounding box: ' + bbox,
        limitations: 'FIRMS active-fire detections are satellite hotspot observations. Spatial clusters are computed by this app using a 1.2 km proximity rule; they are not official NASA cluster identifiers.',
        fires: records
      };
      state.dataset = dataset;
      state.fires = records;
      state.selectedCluster = null;
      state.selectedFireId = null;
      state.season = 'all'; state.satellite = 'all'; state.recurring = false;
      document.getElementById('seasonFilter').value = 'all';
      document.getElementById('satFilter').value = 'all';
      document.getElementById('recurringFilter').checked = false;
      document.querySelectorAll('#heroPlot .signal').forEach(node => node.remove());
      renderProvenance(dataset);
      renderHero();
      document.getElementById('mSignals').textContent = records.length;
      document.getElementById('mZones').textContent = group(records).size;
      document.getElementById('mSeasons').textContent = unique(records.map(record => record.season)).length;
      renderMap();
      setStatus('Loaded ' + records.length + ' NASA FIRMS detections across ' + group(records).size + ' computed spatial clusters.');
    } catch (error) {
      setStatus(error instanceof TypeError ? 'Could not reach NASA FIRMS from this browser. Check network/CORS access; the local illustrative dataset remains active.' : error.message);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function defaultLiveRange() {
    const end = new Date();
    const start = new Date(end.getTime() - 4 * 86400000);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }

  function install() {
    const mapHow = document.getElementById('mapHow');
    const modal = document.getElementById('modal');
    if (!mapHow || !modal) return;
    const connect = document.createElement('button');
    connect.type = 'button'; connect.className = 'control'; connect.id = 'connectFirms';
    connect.textContent = 'Explore by date ↗';
    connect.title = 'Choose a satellite and date range to compare fire detections.';
    mapHow.insertAdjacentElement('afterend', connect);
    connect.addEventListener('click', () => {
      modal.querySelector('.modal').innerHTML = keyForm;
      modal.classList.add('open');
      document.getElementById('firmsCancel').onclick = () => modal.classList.remove('open');
      document.getElementById('firmsLoad').onclick = loadNasaData;
    });
    const autoLoad = () => {
      if (!state.fires.length) return setTimeout(autoLoad, 100);
      loadNasaData({ auto: true });
    };
    window.addEventListener('load', () => setTimeout(autoLoad, 250), { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
