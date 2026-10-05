/* Local data provenance and computed public cluster evidence. */
(function () {
  const requiredLimit = 'A satellite hotspot is not proof of crop-residue burning by a specific farmer. Satellite observations may miss or misclassify fires because of timing, clouds, smoke, and spatial resolution. Human verification is required.';
  const entries = values => {
    const counts = new Map();
    values.forEach(value => { const key = value || 'Not specified'; counts.set(key, (counts.get(key) || 0) + 1); });
    return [...counts].sort((a, b) => b[1] - a[1]).map(([name, count]) => name + ': ' + count).join(' · ') || 'Not provided';
  };
  const dateValue = value => new Date(value + 'T00:00:00');
  const dateLabel = value => fmt(value);
  const peakPeriod = records => {
    const counts = new Map();
    records.forEach(record => {
      const d = dateValue(record.acq_date);
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    if (!counts.size) return 'Not available';
    const max = Math.max(...counts.values());
    return [...counts].filter(([, count]) => count === max).map(([label]) => label + ' (' + max + (max === 1 ? ' record' : ' records') + ')').join(' · ');
  };
  const sourceCounts = records => entries(records.map(record => record.source));

  window.renderProvenance = function (dataset) {
    const records = dataset.fires || [];
    const dates = records.map(record => record.acq_date).filter(Boolean).sort();
    const seasons = [...new Set(records.map(record => record.season).filter(Boolean))].sort();
    const seasonSelect = document.getElementById('seasonFilter');
    const selectedSeason = seasonSelect.value;
    seasonSelect.innerHTML = '<option value="all">All seasons</option>' + seasons.map(value => '<option value="' + value + '">' + value + '</option>').join('');
    seasonSelect.value = seasons.includes(selectedSeason) ? selectedSeason : 'all';
    state.season = seasonSelect.value;
    const satellites = entries(records.map(record => record.satellite));
    const sourceValues = [...new Set(records.map(record => record.source).filter(Boolean))];
    const synthetic = dataset.dataset_status === 'illustrative_demo_data' || sourceValues.some(source => /demo|illustrative|synthetic/i.test(source));
    const nasaFirms = dataset.dataset_status === 'nasa_firms';
    const status = nasaFirms ? 'NASA FIRMS active-fire detections' : synthetic ? 'Synthetic illustrative records · not NASA observations' : 'Local observation dataset';
    document.getElementById('dataStatus').textContent = status;
    document.getElementById('dataSource').textContent = (nasaFirms ? (dataset.data_source || 'NASA FIRMS Area API') + ' · ' + (dataset.product_name || dataset.product || 'satellite product') : 'Local JSON') + ' · ' + (sourceCounts(records) || 'source not specified');
    document.getElementById('satelliteSources').textContent = satellites + (synthetic ? ' · demo labels' : '');
    document.getElementById('observationDates').textContent = dates.length ? dateLabel(dates[0]) + ' – ' + dateLabel(dates[dates.length - 1]) + ' · ' + new Set(dates).size + ' distinct dates' : 'Dates not available';
    const datasetDate = dataset.dataset_date || dataset.datasetDate || dataset.generated_at || dataset.created_at;
    document.getElementById('datasetDate').textContent = datasetDate ? dateLabel(String(datasetDate).slice(0, 10)) : 'Not provided in attached file';
    document.getElementById('dataLimitations').textContent = requiredLimit + (dataset.limitations ? ' ' + dataset.limitations : '');
    const range = seasons.length > 1 ? seasons[0] + '–' + seasons[seasons.length - 1] : seasons[0] || 'No season labels';
    document.getElementById('seasonRange').textContent = range;
    document.getElementById('seasonCaption').textContent = seasons.length ? 'Seasons represented: ' + seasons.join(', ') : 'Season labels are not available';
    document.getElementById('mapDataBadge').textContent = nasaFirms ? 'NASA FIRMS · ' + (dataset.product || '') : synthetic ? 'Illustrative demo data · not NASA' : 'Local observation data';
    const topBadge = document.querySelector('.top-meta .tag.warning');
    if (topBadge) topBadge.textContent = nasaFirms ? 'NASA FIRMS observations' : synthetic ? 'Synthetic local records · not NASA' : 'Local observation records';
    const heroNote = document.querySelector('#heroPlot .plot-note');
    if (heroNote) heroNote.textContent = nasaFirms ? records.length + ' NASA FIRMS DETECTIONS · ' + (dataset.product || 'SATELLITE PRODUCT') : records.length + ' SYNTHETIC RECORDS · SPATIAL SIGNALS';
    const footerNote = document.querySelector('.footer > span');
    if (footerNote) footerNote.textContent = nasaFirms ? 'NASA FIRMS observations loaded for this session · app does not save the data' : 'Illustrative interface prototype · No live satellite data';
  };

  window.openStory = function (id) {
    const c = clusters(filtered()).find(cluster => cluster.id === id) || clusters(state.fires).find(cluster => cluster.id === id);
    if (!c) return;
    state.selectedCluster = id;
    const priority = category(c);
    const satelliteBreakdown = entries(c.records.map(record => record.satellite));
    const sourceBreakdown = entries(c.records.map(record => record.source));
    const seasons = c.seasons.join(', ') || 'Not recorded';
    const narrative = c.records.length + ' observations span ' + c.dates.length + ' distinct dates from ' + dateLabel(c.dates[0]) + ' to ' + dateLabel(c.dates[c.dates.length - 1]) + '. The records cover ' + seasons + ', with mean confidence of ' + Math.round(c.confidence) + '%. The prototype classifies this pattern as ' + priority.toLowerCase() + '; that label describes recurrence and confidence in these records, not a verified cause.';
    const dataset = state.dataset || {};
    const dataDate = dataset.dataset_date || dataset.datasetDate || dataset.generated_at || dataset.created_at;
    const dateRange = c.dates.length ? dateLabel(c.dates[0]) + ' – ' + dateLabel(c.dates[c.dates.length - 1]) : 'Not available';
    document.getElementById('storyContent').innerHTML =
      '<div class="eyebrow">CLUSTER STORY</div><h2>' + c.name + '</h2><div class="priority">' + priority + '</div>' +
      '<p class="story-lead">Returns across ' + c.seasons.length + (c.seasons.length === 1 ? ' season' : ' seasons') + ' · ' + seasons + '</p>' +
      '<div class="count">' + c.records.length + '</div><div class="count-label">Detections in the current filtered view</div>' +
      '<div class="evidence-title">Where</div><div class="evidence-grid"><div class="evidence"><span>Approximate location</span><strong>' + c.lat.toFixed(2) + '° N, ' + c.lon.toFixed(2) + '° E</strong></div><div class="evidence"><span>Cluster</span><strong>' + c.name + '</strong></div></div>' +
      '<div class="evidence-title">When</div><div class="evidence-grid"><div class="evidence"><span>Distinct dates</span><strong>' + c.dates.length + '</strong></div><div class="evidence"><span>Peak period</span><strong>' + peakPeriod(c.records) + '</strong></div><div class="evidence"><span>First observation</span><strong>' + (c.dates[0] ? dateLabel(c.dates[0]) : 'Not available') + '</strong></div><div class="evidence"><span>Latest observation</span><strong>' + (c.dates.at(-1) ? dateLabel(c.dates.at(-1)) : 'Not available') + '</strong></div></div>' +
      '<div class="timeline">' + c.seasons.map(season => '<div class="season"><i></i>' + season + '</div>').join('') + '</div>' +
      '<div class="evidence-title">Signal evidence</div><div class="evidence-grid"><div class="evidence"><span>Average confidence</span><strong>' + Math.round(c.confidence) + '%</strong></div><div class="evidence"><span>Satellite labels in records</span><strong>' + satelliteBreakdown + '</strong></div><div class="evidence"><span>Record source</span><strong>' + sourceBreakdown + '</strong></div><div class="evidence"><span>Recurrence category</span><strong>' + priority + '</strong></div></div>' +
      '<p class="story-priority-note">Recurrence labels are prototype presentation rules, not scientific probability estimates.</p>' +
      '<div class="evidence-title">What this pattern suggests</div><p class="narrative story-narrative">' + narrative + '</p>' +
      '<div class="evidence-title">Data provenance</div><div class="note story-data-source">Data source: ' + (dataset.dataset_status === 'nasa_firms' ? (dataset.data_source || 'NASA FIRMS Area API') + ' · ' + (dataset.product_name || dataset.product || 'satellite product') : 'attached local file, agni-action-demo-fires.json') + '. Record source labels: ' + sourceBreakdown + '. Observation dates: ' + dateRange + '. Dataset date: ' + (dataDate ? dateLabel(String(dataDate).slice(0, 10)) : 'not provided in the attached file') + '. ' + (dataset.dataset_status === 'illustrative_demo_data' ? 'Satellite labels are synthetic demo labels, not verified satellite observations.' : dataset.dataset_status === 'nasa_firms' ? (dataset.limitations || 'NASA FIRMS observation records.') : 'Satellite labels are values in the local records.') + '</div>' +
      '<div class="evidence-title">What this data does not tell us</div><div class="note story-limit">' + requiredLimit + '</div>' +
      '<div class="story-buttons"><button class="back" id="backMap">Back to map</button><button class="primary" id="another">Explore another cluster</button></div>';
    document.getElementById('story').classList.add('open');
    document.getElementById('story').setAttribute('aria-hidden', 'false');
    renderMap();
    document.getElementById('backMap').onclick = closeStory;
    document.getElementById('another').onclick = () => { closeStory(); document.getElementById('mapPlot').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  };
})();
