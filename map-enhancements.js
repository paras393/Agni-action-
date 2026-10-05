/* Coordinate based map styling. All geometry is derived from the local records. */
(function () {
  const MAX_MAP_POINTS = 30;
  window.sampleMapPoints = function sampleMapPoints(records, limit = MAX_MAP_POINTS) {
    if (!Array.isArray(records)) return [];
    const maximum = Math.min(records.length, Math.max(0, Math.floor(Number(limit) || 0)));
    if (records.length <= maximum) return records;
    if (!maximum) return [];

    const grouped = new Map();
    records.forEach((record, index) => {
      const id = record.cluster_id || record.cluster_name || 'unclustered';
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id).push({ record, index });
    });
    const groups = [...grouped.entries()].map(([id, rows]) => ({ id, rows: rows.sort((a, b) =>
      (a.record.latitude - b.record.latitude) || (a.record.longitude - b.record.longitude) ||
      String(a.record.acq_date || '').localeCompare(String(b.record.acq_date || '')) || a.index - b.index
    ) })).sort((a, b) => b.rows.length - a.rows.length || String(a.id).localeCompare(String(b.id))).slice(0, maximum);

    const quotas = groups.map(() => 1);
    let remaining = maximum - groups.length;
    while (remaining > 0) {
      let best = -1, bestScore = -1;
      groups.forEach((group, index) => {
        if (quotas[index] >= group.rows.length) return;
        const score = Math.sqrt(group.rows.length) / (quotas[index] + 1);
        if (score > bestScore) { best = index; bestScore = score; }
      });
      if (best < 0) break;
      quotas[best]++;
      remaining--;
    }

    const selected = [];
    groups.forEach((group, groupIndex) => {
      const count = Math.min(quotas[groupIndex], group.rows.length);
      for (let slot = 0; slot < count; slot++) {
        const index = Math.min(group.rows.length - 1, Math.floor((slot + 0.5) * group.rows.length / count));
        selected.push(group.rows[index]);
      }
    });
    return selected.sort((a, b) => a.index - b.index).map(item => item.record);
  };

  const plot = document.getElementById('mapPlot');
  const layer = document.getElementById('points');
  if (!plot || !layer) return;
  state.zoom = 1;
  const pointCount = document.createElement('span');
  pointCount.id = 'mapPointCount';
  pointCount.className = 'tag';
  pointCount.setAttribute('role', 'status');
  pointCount.setAttribute('aria-live', 'polite');
  const dataBadge = document.getElementById('mapDataBadge');
  if (dataBadge) dataBadge.insertAdjacentElement('afterend', pointCount);

  function dataBounds(records) {
    const lats = records.map(f => f.latitude), lons = records.map(f => f.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const padLat = Math.max((maxLat - minLat) * .13, .008), padLon = Math.max((maxLon - minLon) * .13, .008);
    return { minLat, maxLat, minLon, maxLon, south: minLat - padLat, north: maxLat + padLat, west: minLon - padLon, east: maxLon + padLon };
  }
  function projection(bounds, f) {
    const centerX = 50, centerY = 50;
    const longitude = f.longitude ?? f.lon, latitude = f.latitude ?? f.lat;
    const x = (longitude - bounds.west) / (bounds.east - bounds.west) * 100;
    const y = (bounds.north - latitude) / (bounds.north - bounds.south) * 100;
    return { x: centerX + (x - centerX) * state.zoom, y: centerY + (y - centerY) * state.zoom };
  }
  function drawGeography(records, bounds) {
    const svg = document.getElementById('geoOverlay');
    if (!svg) return;
    svg.innerHTML = '';
    document.getElementById('northCoord').textContent = bounds.maxLat.toFixed(2) + '°';
    document.getElementById('southCoord').textContent = bounds.minLat.toFixed(2) + '°';
    document.getElementById('eastCoord').textContent = bounds.maxLon.toFixed(2) + '°';
    document.getElementById('westCoord').textContent = bounds.minLon.toFixed(2) + '°';
  }
  function setZoom(value) { state.zoom = Math.max(1, Math.min(2.2, value)); renderMap(); }

  window.renderMap = function renderMap() {
    const records = filtered();
    const allClusters = clusters(state.fires);
    const allById = new Map(allClusters.map(c => [c.id, c]));
    const allowed = state.recurring ? allClusters.filter(c => c.seasons.length >= 2).map(c => c.id) : allClusters.map(c => c.id);
    const shown = records.filter(f => allowed.includes(f.cluster_id));
    const mapPoints = window.sampleMapPoints(shown, MAX_MAP_POINTS);
    const visibleClusters = clusters(shown).sort((a, b) => b.records.length - a.records.length || b.confidence - a.confidence);
    const bounds = dataBounds(state.fires);
    document.getElementById('empty').hidden = shown.length > 0;
    drawGeography(shown.length ? shown : state.fires, bounds);
    pointCount.textContent = mapPoints.length + ' of ' + shown.length + ' filtered detections plotted · max ' + MAX_MAP_POINTS;

    layer.querySelectorAll('.point,.cluster-field,.cluster-marker').forEach(n => n.remove());

    const strongest = visibleClusters[0];
    visibleClusters.forEach(c => {
      const full = allById.get(c.id), p = projection(bounds, full || c);
      const kind = category(full || c) === 'Strong recurring signal' ? 'strong' : category(full || c) === 'Moderate recurring signal' ? 'moderate' : 'lower';
      const field = document.createElement('div');
      field.className = 'cluster-field ' + kind + (strongest && c.id === strongest.id ? ' is-strongest' : '') + (state.selectedCluster === c.id ? ' cluster-active' : '');
      field.style.setProperty('--x', p.x + '%'); field.style.setProperty('--y', p.y + '%');
      field.style.setProperty('--field', (kind === 'strong' ? 150 : kind === 'moderate' ? 118 : 92) + 'px');
      layer.append(field);
    });
    mapPoints.forEach(f => {
      const c = allById.get(f.cluster_id), p = projection(bounds, f), kind = category(c) === 'Strong recurring signal' ? 'strong' : category(c) === 'Moderate recurring signal' ? 'moderate' : f.confidence < 60 ? 'lower' : 'isolated';
      const diameter = Math.round(7 + f.confidence / 36 + Math.min(c.seasons.length, 3) * .7);
      const point = document.createElement('button');
      point.type = 'button'; point.className = 'point ' + kind;
      if (state.selectedCluster && state.selectedCluster === f.cluster_id) point.classList.add('cluster-highlight');
      else if (state.selectedCluster) point.classList.add('cluster-dimmed');
      if (state.selectedFireId === f.id) point.classList.add('selected');
      const pxy = projection(bounds, f);
      point.style.setProperty('--x', pxy.x + '%'); point.style.setProperty('--y', pxy.y + '%');
      point.style.setProperty('--diam', diameter + 'px'); point.style.setProperty('--point-opacity', (.53 + f.confidence * .0047).toFixed(2));
      point.dataset.id = f.id;
      point.dataset.tip = fmt(f.acq_date) + ' · ' + f.season + ' · ' + f.satellite + ' · confidence ' + f.confidence + '%\n' + f.cluster_name;
      point.setAttribute('aria-label', fmt(f.acq_date) + ', season ' + f.season + ', ' + f.satellite + ', confidence ' + f.confidence + ', ' + f.cluster_name);
      point.onclick = () => { state.selectedFireId = f.id; openStory(f.cluster_id); };
      layer.append(point);
    });
    const summary = document.getElementById('summary');
    summary.classList.toggle('collapsed', !state.summaryOpen);
    summary.innerHTML = '<button class="summary-toggle" aria-expanded="' + state.summaryOpen + '" aria-label="' + (state.summaryOpen ? 'Hide' : 'Show') + ' current view summary"><span>' + (state.summaryOpen ? 'Current view' : 'View summary') + '</span><span class="toggle-mark">' + (state.summaryOpen ? '−' : '+') + '</span></button><div class="summary-content"><div class="summary-line"><strong>' + shown.length + '</strong><span>visible signals</span></div><div class="summary-line"><strong>' + visibleClusters.filter(c => c.seasons.length >= 2).length + '</strong><span>recurring zones</span></div><div class="summary-line"><strong>' + (strongest ? strongest.seasons.length : '—') + '</strong><span>seasons · peak ' + (strongest ? monthPeak(strongest.records) : '—') + '</span></div><p>' + (strongest ? strongest.name + ' is the strongest signal in the current view.' : 'No cluster is visible with these filters.') + '</p></div>';
    summary.querySelector('.summary-toggle').onclick = () => { state.summaryOpen = !state.summaryOpen; clearTimeout(state.summaryTimer); renderMap(); };
  };

  const closeStoryBase = closeStory;
  window.closeStory = function () { state.selectedFireId = null; closeStoryBase(); };
  document.getElementById('closeStory').onclick = window.closeStory;
  plot.addEventListener('click', event => {
    if (event.target.closest('.point,.cluster-marker,.map-tools,.summary,.legend,.coord-label')) return;
    if (state.selectedCluster || state.selectedFireId) { state.selectedFireId = null; closeStory(); }
  });
  plot.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => setZoom(state.zoom + (button.dataset.zoom === 'in' ? .25 : -.25))));
  plot.querySelector('[data-map-reset]').addEventListener('click', () => { state.selectedFireId = null; state.zoom = 1; closeStory(); });
  plot.querySelector('[data-recenter]').addEventListener('click', () => setZoom(1));
})();
