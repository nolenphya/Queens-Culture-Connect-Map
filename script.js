
// =====================================================
// MAP SETUP
// =====================================================

mapboxgl.accessToken = 'pk.eyJ1IjoiZmx1c2hpbmd0b3duaGFsbCIsImEiOiJjbWRmZHFxb2EwY2p3MmlxM3JoMmJwNDVrIn0.KDnT79yQuUeYVaqcKlmQGQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [-73.94, 40.73],
  zoom: 11
});

map.addControl(
  new mapboxgl.NavigationControl({ showCompass: true }),
  'top-right'
);

// =====================================================
// AIRTABLE SETUP
// =====================================================

const AIRTABLE_API_KEY = 'YOUR_AIRTABLE_KEY';
const BASE_ID = 'YOUR_BASE_ID';
const TABLE_NAME = 'YOUR_TABLE_ID';

const AIRTABLE_URL =
  `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

// =====================================================
// GLOBALS
// =====================================================

let allMarkers = [];
let organizationsVisible = false;
let artistsVisible = false;

let organizationTagGroups = {};
let visibleNeighborhoods = new Set();

const neighborhoodCounts = {}; // populated later

// =====================================================
// ICON MAP
// =====================================================

const iconMap = {
  'Community Garden': 'community-garden',
  'Gallery': 'gallery',
  'Museum/Cultural Institution': 'museum',
  'Music Group/Vocal Ensembles': 'music-group-vocal-ensemble',
  'Dance Company': 'dance-studio',
  'Multidisciplinary Arts Center': 'multidisciplinary-arts-center',
  'Community Center': 'community-center',
  'Theatre': 'theatre',
  'Video-Film Company': 'video-film-company',
  'Art Center-Studio': 'art-center-studio',
  'Cultural Arts Center': 'cultural-arts-center',
  'Historical Society-Preservation Group': 'archive'
};

// =====================================================
// FETCH AIRTABLE DATA
// =====================================================

async function fetchData() {

  const filterFormula = encodeURIComponent("{Approved}=TRUE()");
  const viewName = encodeURIComponent("main");

  let allRecords = [];
  let offset = null;

  do {

    const fetchUrl =
      `${AIRTABLE_URL}?view=${viewName}&filterByFormula=${filterFormula}${
        offset ? `&offset=${offset}` : ''
      }`;

    const res = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    const data = await res.json();

    allRecords = allRecords.concat(data.records || []);

    offset = data.offset || null;

  } while (offset);

  return allRecords;
}

// =====================================================
// CREATE ORGANIZATION MARKERS
// =====================================================

function createMarkers(data) {

  allMarkers.forEach(m => m.remove());
  allMarkers = [];

  organizationTagGroups = {};

  data.forEach(row => {

    const lat = parseFloat(row.Latitude);
    const lng = parseFloat(row.Longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    const tags = (row.Tags || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const primaryTag = tags[0] || 'Uncategorized';

    const iconKey = iconMap[primaryTag] || 'default';

    const el = document.createElement('div');

    el.style.backgroundImage =
      `url(icons/${iconKey}.png)`;

    el.style.width = '32px';
    el.style.height = '32px';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';

    // hidden initially
    el.style.display = 'none';

    // LABEL
    const label = document.createElement('div');

    label.className = 'marker-label';

    label.innerText = row["Org Name"] || "Unnamed";

    label.style.display = 'none';

    el.appendChild(label);

    // POPUP
    const imageUrl =
      Array.isArray(row.Image) && row.Image.length
        ? row.Image[0].url
        : '';

    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div style="max-width:250px;">
          ${
            imageUrl
              ? `<img src="${imageUrl}" style="width:100%;margin-bottom:10px;">`
              : ''
          }

          <h3>${row["Org Name"] || 'Untitled'}</h3>

          ${
            row.Description
              ? `<p>${row.Description}</p>`
              : ''
          }

          ${
            row.Address
              ? `<p><b>Address:</b><br>${row.Address}</p>`
              : ''
          }
        </div>
      `);

    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    marker.rowData = row;
    marker.labelElement = label;

    allMarkers.push(marker);

    // TAG GROUPS

    tags.forEach(tag => {

      if (!organizationTagGroups[tag]) {
        organizationTagGroups[tag] = [];
      }

      organizationTagGroups[tag].push(marker);
    });
  });
}

// =====================================================
// LOAD ARTIST CHOROPLETH
// =====================================================

async function loadArtistLayer() {

  const response = await fetch('queens_nta.geojson');

  const geojson = await response.json();

  geojson.features.forEach(feature => {

    const nta = feature.properties.ntaname;

    const count = neighborhoodCounts[nta] || 0;

    feature.properties.artist_count = count;

    visibleNeighborhoods.add(nta);
  });

  map.addSource('artists-nta', {
    type: 'geojson',
    data: geojson
  });

  map.addLayer({
    id: 'artist-fill-layer',
    type: 'fill',
    source: 'artists-nta',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'artist_count'],
        0, '#f5f5f5',
        5, '#cccccc',
        10, '#969696',
        15, '#525252'
      ],
      'fill-opacity': 0.75
    }
  });

  map.addLayer({
    id: 'artist-outline-layer',
    type: 'line',
    source: 'artists-nta',
    paint: {
      'line-color': '#ffffff',
      'line-width': 1
    }
  });

  // hidden initially

  map.setLayoutProperty(
    'artist-fill-layer',
    'visibility',
    'none'
  );

  map.setLayoutProperty(
    'artist-outline-layer',
    'visibility',
    'none'
  );
}

// =====================================================
// LEGEND SECTION BUILDER
// =====================================================

function createLegendSection(title) {

  const section = document.createElement('div');

  section.className = 'legend-section';

  const header = document.createElement('div');

  header.className = 'legend-section-header';

  const arrow = document.createElement('span');

  arrow.className = 'legend-arrow';

  arrow.textContent = '▶';

  const checkbox = document.createElement('input');

  checkbox.type = 'checkbox';

  const label = document.createElement('label');

  label.textContent = title;

  const content = document.createElement('div');

  content.className =
    'legend-section-content collapsed';

  header.appendChild(arrow);
  header.appendChild(checkbox);
  header.appendChild(label);

  section.appendChild(header);
  section.appendChild(content);

  header.addEventListener('click', e => {

    if (e.target.tagName.toLowerCase() === 'input') {
      return;
    }

    content.classList.toggle('collapsed');

    arrow.textContent =
      content.classList.contains('collapsed')
        ? '▶'
        : '▼';
  });

  return {
    section,
    content,
    checkbox
  };
}

// =====================================================
// BUILD COMBINED LEGEND
// =====================================================

function buildCombinedLegend() {

  const legend =
    document.getElementById('legend-content');

  legend.innerHTML = '';

  // =====================================================
  // ORGANIZATIONS
  // =====================================================

  const organizationsSection =
    createLegendSection('Organizations');

  legend.appendChild(organizationsSection.section);

  organizationsSection.checkbox.addEventListener(
    'change',
    e => {

      organizationsVisible = e.target.checked;

      allMarkers.forEach(marker => {

        marker.getElement().style.display =
          organizationsVisible
            ? 'block'
            : 'none';
      });

      if (organizationsVisible) {
        organizationsSection.content.classList.remove(
          'collapsed'
        );
      }
    }
  );

  Object.entries(organizationTagGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([tag, markers]) => {

      const tagSection =
        document.createElement('div');

      tagSection.className = 'legend-category';

      const tagHeader =
        document.createElement('div');

      tagHeader.className = 'legend-category-header';

      tagHeader.innerHTML =
        `<span class="arrow">▸</span> ${tag}`;

      const list = document.createElement('ul');

      list.style.display = 'none';

      tagHeader.addEventListener('click', () => {

        const collapsed =
          list.style.display === 'none';

        list.style.display =
          collapsed ? 'block' : 'none';

        tagHeader.querySelector('.arrow').textContent =
          collapsed ? '▾' : '▸';
      });

      markers
        .sort((a, b) => {

          const aName =
            (a.rowData["Org Name"] || '').toLowerCase();

          const bName =
            (b.rowData["Org Name"] || '').toLowerCase();

          return aName.localeCompare(bName);
        })

        .forEach(marker => {

          const li = document.createElement('li');

          const checkbox =
            document.createElement('input');

          checkbox.type = 'checkbox';

          checkbox.checked = true;

          checkbox.addEventListener('change', () => {

            marker.getElement().style.display =
              organizationsVisible &&
              checkbox.checked
                ? 'block'
                : 'none';
          });

          const label =
            document.createElement('span');

          label.textContent =
            marker.rowData["Org Name"] || 'Unnamed';

          label.className = 'legend-link';

          label.addEventListener('click', () => {

            map.flyTo({
              center: marker.getLngLat(),
              zoom: 15
            });

            marker.togglePopup();
          });

          li.appendChild(checkbox);
          li.appendChild(label);

          list.appendChild(li);
        });

      tagSection.appendChild(tagHeader);
      tagSection.appendChild(list);

      organizationsSection.content.appendChild(
        tagSection
      );
    });

  // =====================================================
  // ARTISTS
  // =====================================================

  const artistsSection =
    createLegendSection('Artists');

  legend.appendChild(artistsSection.section);

  artistsSection.checkbox.addEventListener(
    'change',
    e => {

      artistsVisible = e.target.checked;

      const visibility =
        artistsVisible ? 'visible' : 'none';

      map.setLayoutProperty(
        'artist-fill-layer',
        'visibility',
        visibility
      );

      map.setLayoutProperty(
        'artist-outline-layer',
        'visibility',
        visibility
      );

      if (artistsVisible) {
        artistsSection.content.classList.remove(
          'collapsed'
        );
      }
    }
  );

  Object.keys(neighborhoodCounts)
    .sort()
    .forEach(neighborhood => {

      const row = document.createElement('div');

      row.className = 'legend-item-row';

      const checkbox =
        document.createElement('input');

      checkbox.type = 'checkbox';

      checkbox.checked = true;

      const label =
        document.createElement('label');

      label.textContent = neighborhood;

      checkbox.addEventListener('change', () => {

        if (checkbox.checked) {
          visibleNeighborhoods.add(neighborhood);
        } else {
          visibleNeighborhoods.delete(neighborhood);
        }

        updateNeighborhoodFilters();
      });

      row.appendChild(checkbox);
      row.appendChild(label);

      artistsSection.content.appendChild(row);
    });
}

// =====================================================
// UPDATE ARTIST FILTERS
// =====================================================

function updateNeighborhoodFilters() {

  const selected =
    Array.from(visibleNeighborhoods);

  map.setFilter('artist-fill-layer', [
    'in',
    ['get', 'ntaname'],
    ['literal', selected]
  ]);

  map.setFilter('artist-outline-layer', [
    'in',
    ['get', 'ntaname'],
    ['literal', selected]
  ]);
}

// =====================================================
// SEARCH
// =====================================================

document
  .getElementById('search-input')
  .addEventListener('input', e => {

    const query =
      e.target.value.trim().toLowerCase();

    const results =
      document.getElementById('search-results');

    results.innerHTML = '';

    if (!query) return;

    const matches = allMarkers.filter(marker => {

      const name =
        (marker.rowData["Org Name"] || '')
          .toLowerCase();

      const tags =
        (marker.rowData.Tags || '')
          .toLowerCase();

      return (
        name.includes(query) ||
        tags.includes(query)
      );
    });

    matches.forEach(marker => {

      const div =
        document.createElement('div');

      div.className = 'search-result';

      div.textContent =
        marker.rowData["Org Name"];

      div.addEventListener('click', () => {

        map.flyTo({
          center: marker.getLngLat(),
          zoom: 15
        });

        marker.togglePopup();
      });

      results.appendChild(div);
    });
  });

// =====================================================
// ZOOM LABELS
// =====================================================

map.on('zoom', () => {

  const zoom = map.getZoom();

  allMarkers.forEach(marker => {

    if (!marker.labelElement) return;

    marker.labelElement.style.display =
      zoom >= 14 &&
      organizationsVisible
        ? 'block'
        : 'none';
  });
});

// =====================================================
// LOAD EVERYTHING
// =====================================================

map.on('load', async () => {

  const records = await fetchData();

  const orgData = records.map(r => ({
    id: r.id,
    ...r.fields
  }));

  createMarkers(orgData);

  await loadArtistLayer();

  buildCombinedLegend();
});