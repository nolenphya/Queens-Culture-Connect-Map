
// =====================================================
// MAP SETUP
// =====================================================

mapboxgl.accessToken =
  'pk.eyJ1IjoiZmx1c2hpbmd0b3duaGFsbCIsImEiOiJjbWRmZHFxb2EwY2p3MmlxM3JoMmJwNDVrIn0.KDnT79yQuUeYVaqcKlmQGQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [-73.94, 40.73],
  zoom: 11
});

map.addControl(
  new mapboxgl.NavigationControl({
    showCompass: true
  }),
  'top-right'
);

// =====================================================
// AIRTABLE SETUP
// =====================================================

const AIRTABLE_API_KEY = 'patboskAQTJUi9FlQ.1c30c3c632cd4d7bd03cf949e50edd922425aba8dcbf0c8a6002e98db67c74a3';

const BASE_ID =
  'apppBx0a9hj0Z1ciw';

const TABLE_NAME =
  'tblgqyoE5TZUzQDKw';

const AIRTABLE_URL =
  `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

// =====================================================
// ARTIST AIRTABLE
// =====================================================

const ARTIST_BASE_ID = 'apppBx0a9hj0Z1ciw';
const ARTIST_TABLE_NAME = 'tbl9OiPT8QI8ss20e';
const ARTIST_AIRTABLE_URL = `https://api.airtable.com/v0/${ARTIST_BASE_ID}/${ARTIST_TABLE_NAME}`;

// =====================================================
// ZIP CODE CROSSWALK
// =====================================================

const ZIP_TO_NTA = {
  "11101": "Long Island City-Hunter's Point",
  "11102": "Astoria",
  "11103": "Astoria",
  "11104": "Sunnyside",
  "11105": "Astoria",
  "11106": "Astoria",
  "11354": "Flushing",
  "11355": "Flushing",
  "11356": "College Point",
  "11357": "Whitestone",
  "11358": "Flushing",
  "11360": "Bayside-Little Neck",
  "11361": "Bayside-Little Neck",
  "11362": "Bayside-Little Neck",
  "11363": "Bayside-Little Neck",
  "11364": "Bayside-Little Neck",
  "11365": "Fresh Meadows",
  "11366": "Fresh Meadows",
  "11367": "Kew Gardens Hills",
  "11368": "Corona",
  "11369": "Airport",
  "11370": "Jackson Heights",
  "11371": "Airport",
  "11372": "Jackson Heights",
  "11373": "Elmhurst",
  "11374": "Rego Park",
  "11375": "Forest Hills",
  "11377": "Woodside",
  "11378": "Maspeth",
  "11379": "Middle Village",
  "11385": "Ridgewood",
  "11411": "Cambria Heights",
  "11412": "St. Albans",
  "11413": "Laurelton",
  "11414": "Howard Beach",
  "11415": "Kew Gardens",
  "11416": "Ozone Park",
  "11417": "Ozone Park",
  "11418": "Richmond Hill",
  "11419": "Richmond Hill",
  "11420": "South Ozone Park",
  "11421": "Woodhaven",
  "11422": "Rosedale",
  "11423": "Hollis",
  "11426": "Bellerose",
  "11427": "Hollis",
  "11428": "Queens Village",
  "11429": "Queens Village",
  "11432": "Jamaica",
  "11433": "Jamaica",
  "11434": "Jamaica",
  "11435": "Jamaica",
  "11436": "Jamaica",
  "11691": "Far Rockaway-Bayswater",
  "11692": "Rockaway Beach",
  "11693": "Rockaway Beach",
  "11694": "Rockaway Beach",
  "11697": "Breezy Point"
};

// =====================================================
// GLOBAL DATA STORAGE
// =====================================================

let organizationsData = [];
let artistsData = [];
let allActiveRecords = [];
let allMarkers = [];
let geoData = null;

const hiddenTags = new Set();
const enabledNeighborhoods = new Set();
let assignedColors = {};

let organizationsVisible = true;
let artistsVisible = true;

// =====================================================
// DATA FETCHING (AIRTABLE)
// =====================================================

async function fetchAllAirtable(url) {
  let allRecords = [];
  let offset = '';
  try {
    do {
      const fetchUrl = offset ? `${url}?offset=${offset}` : url;
      const resp = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
      });
      if (!resp.ok) throw new Error(`HTTP Error: ${resp.status}`);
      const data = await resp.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset || '';
    } while (offset);
    return allRecords;
  } catch (err) {
    console.error("Airtable fetch failed:", err);
    return [];
  }
}

// =====================================================
// SUBWAY LAYERS
// =====================================================

function loadSubwayLayers() {
  map.addSource('subway-stations', {
    type: 'geojson',
    data: 'subway_stations.geojson'
  });

  map.addLayer({
    id: 'subway-dots-layer',
    type: 'circle',
    source: 'subway-stations',
    paint: {
      'circle-radius': 4.5,
      'circle-color': '#FFD700',
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#000000'
    }
  });

  map.addLayer({
    id: 'subway-labels-layer',
    type: 'symbol',
    source: 'subway-stations',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-size': 10,
      'text-offset': [0, 0.8],
      'text-anchor': 'top',
      'visibility': 'none'
    },
    paint: {
      'text-color': '#333333',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5
    }
  });

  map.on('click', 'subway-dots-layer', (e) => {
    if (!e.features.length) return;
    const props = e.features[0].properties;
    const coords = e.features[0].geometry.coordinates;

    new mapboxgl.Popup()
      .setLngLat(coords)
      .setHTML(`
        <div style="font-family:sans-serif; padding:4px;">
          <strong style="font-size:13px; color:#111;">${props.name}</strong><br/>
          <span style="font-size:11px; color:#555; margin-top:3px; display:inline-block;">
            <b>Lines:</b> ${props.line}
          </span>
        </div>
      `)
      .addTo(map);
  });

  map.on('mouseenter', 'subway-dots-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'subway-dots-layer', () => { map.getCanvas().style.cursor = ''; });
}

// =====================================================
// CHOROPLETH COLOR CALCULATIONS (FIXED MOVED UP)
// =====================================================

function getStepColor(count, max) {
  if (max <= 0) return '#f7fbff';
  const pct = count / max;
  if (pct > 0.85) return '#084594';
  if (pct > 0.70) return '#2171b5';
  if (pct > 0.55) return '#4292c6';
  if (pct > 0.40) return '#6baed6';
  if (pct > 0.25) return '#9ecae1';
  if (pct > 0.10) return '#c6dbef';
  if (pct > 0.02) return '#deebf7';
  return '#f7fbff';
}

function getColorSpectrum(max) {
  return [
    { label: '0', color: '#f7fbff' },
    { label: `1 - ${Math.max(1, Math.round(max * 0.15))}`, color: '#deebf7' },
    { label: `${Math.round(max * 0.15) + 1} - ${Math.round(max * 0.4)}`, color: '#9ecae1' },
    { label: `${Math.round(max * 0.4) + 1} - ${Math.round(max * 0.7)}`, color: '#4292c6' },
    { label: `${Math.round(max * 0.7) + 1}+`, color: '#084594' }
  ];
}

// =====================================================
// COMBINED CHECKLIST LEGEND ENGINE (FIXED LOCATION)
// =====================================================

function buildCombinedLegend(groups, maxCount) {
  const container = document.getElementById('legend');
  if (!container) return;

  container.innerHTML = '';

  const scaleSteps = getColorSpectrum(maxCount);

  const scaleWrapper = document.createElement('div');
  scaleWrapper.style.margin = '0 0 15px 0';
  scaleWrapper.style.padding = '8px';
  scaleWrapper.style.background = '#f9f9f9';
  scaleWrapper.style.borderRadius = '4px';
  scaleWrapper.style.border = '1px solid #eaeaea';

  let scaleHtml = `<div style="font-size:11px; font-weight:bold; margin-bottom:6px; color:#444; text-transform:uppercase;">Artist Density Scale</div>`;
  scaleSteps.forEach(step => {
    scaleHtml += `
      <div style="display:flex; align-items:center; margin-bottom:3px; font-size:11px;">
        <div style="width:16px; height:11px; background:${step.color}; margin-right:8px; border:1px solid #ccc; border-radius:1px;"></div>
        <span>${step.label} spaces</span>
      </div>`;
  });
  scaleWrapper.innerHTML = scaleHtml;
  container.appendChild(scaleWrapper);

  const catTitle = document.createElement('h3');
  catTitle.style = "margin: 15px 0 8px 0; font-size:12px; text-transform:uppercase; color:#666; letter-spacing:0.5px;";
  catTitle.textContent = "Filter Neighborhoods";
  container.appendChild(catTitle);

  Object.keys(groups).sort().forEach(ntaName => {
    const totalArtists = groups[ntaName].length;
    if (totalArtists === 0) return;

    const row = document.createElement('div');
    row.className = 'neighborhood-legend-item';
    row.style = "display:flex; align-items:center; padding:4px 0; font-size:12px;";

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.marginRight = '8px';
    checkbox.checked = enabledNeighborhoods.has(ntaName);

    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        enabledNeighborhoods.add(ntaName);
      } else {
        enabledNeighborhoods.delete(ntaName);
      }
      refreshMapFiltersAndPins();
    });

    const colorSwatch = document.createElement('div');
    colorSwatch.style = `width:12px; height:12px; background:${getStepColor(totalArtists, maxCount)}; margin-right:8px; border:1px solid #777; border-radius:2px; flex-shrink:0;`;

    const nameSpan = document.createElement('span');
    nameSpan.style = "cursor:pointer; flex-grow:1; color:#333;";
    nameSpan.innerHTML = `<b>${ntaName}</b> <span style="color:#888;">(${totalArtists})</span>`;

    nameSpan.addEventListener('click', () => {
      if (geoData) {
        const featureMatch = geoData.features.find(f => f.properties.ntaname === ntaName);
        if (featureMatch && typeof turf !== 'undefined') {
          const centerPoint = turf.center(featureMatch).geometry.coordinates;
          map.flyTo({ center: centerPoint, zoom: 13.5, essential: true });
        }
      }
    });

    row.appendChild(checkbox);
    row.appendChild(colorSwatch);
    row.appendChild(nameSpan);
    container.appendChild(row);
  });
}

// =====================================================
// MAP SYNCHRONIZATION AND RENDER FILTERS
// =====================================================

function refreshMapFiltersAndPins() {
  if (!map.getSource('queens-boundaries') || !geoData) return;

  const counts = {};
  allActiveRecords.forEach(r => {
    let zip = String((Array.isArray(r.Zip_Code) ? r.Zip_Code[0] : r.Zip_Code) || "").trim();
    const hood = ZIP_TO_NTA[zip];
    if (hood) counts[hood] = (counts[hood] || 0) + 1;
  });

  const maxVal = Object.values(counts).length ? Math.max(...Object.values(counts)) : 1;
  const matchExpression = ['match', ['get', 'ntaname']];

  geoData.features.forEach(f => {
    const name = f.properties.ntaname;
    if (enabledNeighborhoods.has(name)) {
      const activeColor = getStepColor(counts[name] || 0, maxVal);
      matchExpression.push(name, activeColor);
    } else {
      matchExpression.push(name, 'rgba(0,0,0,0)');
    }
  });

  matchExpression.push('rgba(0,0,0,0)');
  map.setPaintProperty('neighborhood-polygons-fill', 'fill-color', matchExpression);

  allMarkers.forEach(m => {
    let zip = String((Array.isArray(m.rowData.Zip_Code) ? m.rowData.Zip_Code[0] : m.rowData.Zip_Code) || "").trim();
    const hood = ZIP_TO_NTA[zip];
    if (enabledNeighborhoods.has(hood)) {
      m.getElement().style.display = 'block';
      if (m.labelElement) m.labelElement.style.display = (map.getZoom() >= 14) ? 'block' : 'none';
    } else {
      m.getElement().style.display = 'none';
      if (m.labelElement) m.labelElement.style.display = 'none';
    }
  });
}

// =====================================================
// SEARCH DIRECTORY AUTOCOMPLETE
// =====================================================

function setupSearchInput() {
  const searchInput = document.getElementById('search-input');
  const resultsBox = document.getElementById('search-results');
  if (!searchInput || !resultsBox) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    resultsBox.innerHTML = '';
    if (!query) return;

    const matched = allActiveRecords.filter(r => {
      const name = (r["Org Name"] || r["Name"] || "").toLowerCase();
      const disc = (r["Artistic Disciplines"] || "").toLowerCase();
      return name.includes(query) || disc.includes(query);
    }).slice(0, 5);

    matched.forEach(m => {
      const div = document.createElement('div');
      div.className = 'search-suggestion-item';
      div.style = "padding:8px; cursor:pointer; border-bottom:1px solid #ddd; background:#fff; font-size:13px;";
      div.innerHTML = `<b>${m["Name"] || m["Org Name"] || "Unnamed"}</b><br><small>${m["Artistic Disciplines"] || ""}</small>`;

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        let zip = String((Array.isArray(m.Zip_Code) ? m.Zip_Code[0] : m.Zip_Code) || "").trim();
        const hoodName = ZIP_TO_NTA[zip];
        if (hoodName && geoData) {
          const feat = geoData.features.find(f => f.properties.ntaname === hoodName);
          if (feat && typeof turf !== 'undefined') {
            const center = turf.center(feat).geometry.coordinates;
            map.flyTo({ center, zoom: 14.5 });
          }
        }
        resultsBox.innerHTML = '';
        searchInput.value = '';
      });
      resultsBox.appendChild(div);
    });
  });
}

// =====================================================
// INTERFACE PANEL STATE BINDINGS
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('legend-panel');
  const toggleBtn = document.getElementById('legend-toggle');
  const resetBtn = document.getElementById('reset-legend');
  const introBtn = document.getElementById('close-intro');
  const guideBox = document.getElementById('map-guide-overlay');
  const guideClose = document.getElementById('map-guide-close');
  const infoFab = document.getElementById('info-button');
  const searchInput = document.getElementById('search-input');
  const resultsBox = document.getElementById('search-results');

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      toggleBtn.textContent = panel.classList.contains('collapsed') ? 'Show' : 'Hide';
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      enabledNeighborhoods.clear();
      if (geoData) {
        geoData.features.forEach(f => enabledNeighborhoods.add(f.properties.ntaname));
      }
      const groups = {};
      allActiveRecords.forEach(r => {
        let zip = String((Array.isArray(r.Zip_Code) ? r.Zip_Code[0] : r.Zip_Code) || "").trim();
        const hood = ZIP_TO_NTA[zip];
        if (hood) {
          if (!groups[hood]) groups[hood] = [];
          groups[hood].push(r);
        }
      });
      const maxCount = Object.values(groups).length ? Math.max(...Object.values(groups).map(g => g.length)) : 1;
      buildCombinedLegend(groups, maxCount);
      refreshMapFiltersAndPins();

      if (searchInput) searchInput.value = '';
      if (resultsBox) resultsBox.innerHTML = '';

      map.flyTo({ center: [-73.94, 40.73], zoom: 11 });
    });
  }

  if (introBtn) {
    introBtn.addEventListener('click', () => {
      document.getElementById('intro-overlay').style.display = 'none';
      if (guideBox) guideBox.style.display = 'flex';
    });
  }

  if (infoFab && guideBox) {
    infoFab.addEventListener('click', () => {
      guideBox.style.display = 'flex';
    });
  }

  if (guideClose && guideBox) {
    guideClose.addEventListener('click', () => {
      guideBox.style.display = 'none';
    });
  }
});

// =====================================================
// ZOOM DYNAMIC MARKER TEXT RESPONSIVENESS
// =====================================================

map.on('zoom', () => {
  const zoom = map.getZoom();
  allMarkers.forEach(m => {
    let zip = String((Array.isArray(m.rowData.Zip_Code) ? m.rowData.Zip_Code[0] : m.rowData.Zip_Code) || "").trim();
    const hood = ZIP_TO_NTA[zip];
    if (enabledNeighborhoods.has(hood)) {
      if (m.labelElement) m.labelElement.style.display = (zoom >= 14) ? 'block' : 'none';
    }
  });
});

// =====================================================
// INITIALIZATION AND PIPELINE LOAD
// =====================================================

map.on('load', async () => {
  loadSubwayLayers();

  const orgRecords = await fetchAllAirtable(AIRTABLE_URL);
  organizationsData = orgRecords.map(r => ({ id: r.id, ...r.fields }));

  const artistRecords = await fetchAllAirtable(ARTIST_AIRTABLE_URL);
  artistsData = artistRecords.map(r => ({ id: r.id, ...r.fields }));

  allActiveRecords = [...organizationsData, ...artistsData];

  try {
    const geoResp = await fetch('queens_neighborhoods.geojson');
    geoData = await geoResp.json();
  } catch (err) {
    console.error("GeoJSON boundaries failed to load:", err);
  }

  const groups = {};
  if (geoData) {
    geoData.features.forEach(f => {
      const name = f.properties.ntaname;
      groups[name] = [];
      enabledNeighborhoods.add(name);
    });
  }

  allActiveRecords.forEach(r => {
    let zip = String((Array.isArray(r.Zip_Code) ? r.Zip_Code[0] : r.Zip_Code) || "").trim();
    const hood = ZIP_TO_NTA[zip];
    if (hood) {
      if (!groups[hood]) groups[hood] = [];
      groups[hood].push(r);
    }
  });

  const maxCount = Object.values(groups).length ? Math.max(...Object.values(groups).map(g => g.length)) : 1;

  if (geoData) {
    map.addSource('queens-boundaries', { type: 'geojson', data: geoData });
    map.addLayer({
      id: 'neighborhood-polygons-fill',
      type: 'fill',
      source: 'queens-boundaries',
      paint: { 'fill-opacity': 0.6 }
    });
    map.addLayer({
      id: 'neighborhood-polygons-stroke',
      type: 'line',
      source: 'queens-boundaries',
      paint: { 'line-color': '#ffffff', 'line-width': 1.2 }
    });
  }

  buildCombinedLegend(groups, maxCount);
  refreshMapFiltersAndPins();
  setupSearchInput();
});

