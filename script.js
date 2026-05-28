
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

const BASE_ID = 'apppBx0a9hj0Z1ciw';
const TABLE_NAME = 'tblgqyoE5TZUzQDKw';

const AIRTABLE_URL =
  `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

// =====================================================
// ARTIST AIRTABLE
// =====================================================

const ARTIST_BASE_ID = 'YOUR_ARTIST_BASE';
const ARTIST_TABLE = 'YOUR_ARTIST_TABLE';

const ARTIST_URL =
  `https://api.airtable.com/v0/${ARTIST_BASE_ID}/${ARTIST_TABLE}`;

// =====================================================
// GLOBALS
// =====================================================

let allMarkers = [];

let organizationsVisible = false;
let artistsVisible = false;

let organizationTagGroups = {};

let visibleNeighborhoods = new Set();

const neighborhoodCounts = {};

const BASE_SOFTR_DIRECTORY =
  "https://elwanda52071.softr.app/artists";

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
// FETCH ORGANIZATION DATA
// =====================================================

async function fetchData() {

  const filterFormula =
    encodeURIComponent("{Approved}=TRUE()");

  const viewName =
    encodeURIComponent("main");

  let allRecords = [];
  let offset = null;

  try {

    do {

      const fetchUrl =
        `${AIRTABLE_URL}?view=${viewName}&filterByFormula=${filterFormula}${
          offset ? `&offset=${offset}` : ""
        }`;

      const res = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`
        }
      });

      const data = await res.json();

      allRecords =
        allRecords.concat(data.records || []);

      offset = data.offset || null;

    } while (offset);

    return allRecords;

  } catch (err) {

    console.error("Fetch failed:", err);

    return allRecords;
  }
}

// =====================================================
// FETCH ARTIST DATA
// =====================================================

async function fetchArtistData() {

  let records = [];
  let offset = null;

  do {

    const res = await fetch(
      `${ARTIST_URL}${offset ? `?offset=${offset}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`
        }
      }
    );

    const data = await res.json();

    records = records.concat(data.records || []);

    offset = data.offset || null;

  } while (offset);

  return records.map(r => r.fields);
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

    el.style.display = 'none';

    // LABEL

    const label = document.createElement('div');

    label.className = 'marker-label';

    label.innerText =
      row["Org Name"] || "Unnamed";

    label.style.display = 'none';

    el.appendChild(label);

    // POPUP

    const imageUrl =
      Array.isArray(row.Image) &&
      row.Image.length
        ? row.Image[0].url
        : '';

    const popup =
      new mapboxgl.Popup({ offset: 25 })
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

    const marker =
      new mapboxgl.Marker(el)
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

  const artists = await fetchArtistData();

  artists.forEach(artist => {

    const neighborhood =
      artist.Neighborhood?.trim();

    if (!neighborhood) return;

    if (!neighborhoodCounts[neighborhood]) {
      neighborhoodCounts[neighborhood] = 0;
    }

    neighborhoodCounts[neighborhood]++;
  });

  const response =
    await fetch('queens_nta.geojson');

  const geojson =
    await response.json();

  geojson.features.forEach(feature => {

    const nta =
      feature.properties.ntaname?.trim();

    const count =
      neighborhoodCounts[nta] || 0;

    feature.properties.artist_count = count;

    visibleNeighborhoods.add(nta);
  });

  // SOURCE

  if (!map.getSource('artists-nta')) {

    map.addSource('artists-nta', {
      type: 'geojson',
      data: geojson
    });

  }

  // FILL

  if (!map.getLayer('artist-fill-layer')) {

    map.addLayer({
      id: 'artist-fill-layer',
      type: 'fill',
      source: 'artists-nta',

      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'artist_count'],

          0, '#f7fbff',
          1, '#deebf7',
          3, '#c6dbef',
          5, '#9ecae1',
          8, '#6baed6',
          12, '#4292c6',
          16, '#2171b5',
          20, '#08519c',
          30, '#08306b'
        ],

        'fill-opacity': 0.75
      }
    });

  }

  // OUTLINES

  if (!map.getLayer('artist-outline-layer')) {

    map.addLayer({
      id: 'artist-outline-layer',
      type: 'line',
      source: 'artists-nta',

      paint: {
        'line-color': '#ffffff',
        'line-width': 1
      }
    });

  }

  // POPUPS

  map.on('click', 'artist-fill-layer', e => {

    const feature = e.features[0];

    const name =
      feature.properties.ntaname;

    const count =
      feature.properties.artist_count || 0;

    const filterLink =
      `${BASE_SOFTR_DIRECTORY}?filter-by-Neighborhood=${encodeURIComponent(name)}`;

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <div style="max-width:220px;">
          <h3>${name}</h3>

          <p>
            ${count} artist${count === 1 ? '' : 's'}
          </p>

          <a href="${filterLink}" target="_blank">
            View Artists
          </a>
        </div>
      `)
      .addTo(map);
  });

  map.on('mouseenter', 'artist-fill-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'artist-fill-layer', () => {
    map.getCanvas().style.cursor = '';
  });

  // HIDDEN INITIALLY

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
// LOAD SUBWAY LAYERS
// =====================================================

function loadSubwayLayers() {

  if (!map.getSource('subway-lines')) {

    map.addSource('subway-lines', {
      type: 'geojson',
      data: 'nyc-subway-routes.geojson'
    });

  }

  if (!map.getLayer('subway-lines-layer')) {

    map.addLayer({
      id: 'subway-lines-layer',
      type: 'line',
      source: 'subway-lines',

      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },

      paint: {
        'line-width': 2,

        'line-color': [
          'match',
          ['get', 'rt_symbol'],

          '1', '#EE352E',
          '2', '#EE352E',
          '3', '#EE352E',

          '4', '#00933C',
          '5', '#00933C',
          '6', '#00933C',

          'A', '#2850AD',
          'C', '#2850AD',
          'E', '#2850AD',

          'B', '#FF6319',
          'D', '#FF6319',
          'F', '#FF6319',
          'M', '#FF6319',

          'N', '#FCCC0A',
          'Q', '#FCCC0A',
          'R', '#FCCC0A',
          'W', '#FCCC0A',

          'L', '#A7A9AC',
          'G', '#6CBE45',

          'J', '#996633',
          'Z', '#996633',

          '7', '#B933AD',

          '#000000'
        ]
      }
    });

  }

  if (!map.getSource('subway-stops')) {

    map.addSource('subway-stops', {
      type: 'geojson',
      data: 'nyc-subway-stops.geojson'
    });

  }

  if (!map.getLayer('subway-stops-layer')) {

    map.addLayer({
      id: 'subway-stops-layer',
      type: 'circle',
      source: 'subway-stops',

      paint: {
        'circle-radius': 1,
        'circle-color': '#ffffff',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#000000'
      }
    });

  }

  if (!map.getLayer('subway-labels-layer')) {

    map.addLayer({
      id: 'subway-labels-layer',
      type: 'symbol',
      source: 'subway-stops',

      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'visibility': 'none'
      },

      paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1
      }
    });

  }
}

// =====================================================
// LEGEND SECTION BUILDER
// =====================================================

function createLegendSection(title) {

  const section =
    document.createElement('div');

  section.className = 'legend-section';

  const header =
    document.createElement('div');

  header.className =
    'legend-section-header';

  const arrow =
    document.createElement('span');

  arrow.className = 'legend-arrow';

  arrow.textContent = '▶';

  const checkbox =
    document.createElement('input');

  checkbox.type = 'checkbox';

  const label =
    document.createElement('label');

  label.textContent = title;

  const content =
    document.createElement('div');

  content.className =
    'legend-section-content collapsed';

  header.appendChild(arrow);
  header.appendChild(checkbox);
  header.appendChild(label);

  section.appendChild(header);
  section.appendChild(content);

  header.addEventListener('click', e => {

    if (
      e.target.tagName.toLowerCase() === 'input'
    ) return;

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
// BUILD LEGEND
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

  legend.appendChild(
    organizationsSection.section
  );

  organizationsSection.checkbox.addEventListener(
    'change',
    e => {

      organizationsVisible =
        e.target.checked;

      allMarkers.forEach(marker => {

        marker.getElement().style.display =
          organizationsVisible
            ? 'block'
            : 'none';
      });

      if (organizationsVisible) {

        organizationsSection.content
          .classList.remove('collapsed');

      }
    }
  );

  Object.entries(organizationTagGroups)
    .sort(([a], [b]) =>
      a.localeCompare(b)
    )

    .forEach(([tag, markers]) => {

      const tagSection =
        document.createElement('div');

      const tagHeader =
        document.createElement('div');

      const list =
        document.createElement('ul');

      tagHeader.innerHTML =
        `<span class="arrow">▸</span> ${tag}`;

      list.style.display = 'none';

      tagHeader.addEventListener('click', () => {

        const collapsed =
          list.style.display === 'none';

        list.style.display =
          collapsed ? 'block' : 'none';

        tagHeader.querySelector('.arrow')
          .textContent =
            collapsed ? '▾' : '▸';
      });

      markers.forEach(marker => {

        const li =
          document.createElement('li');

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

        label.className = 'legend-link';

        label.textContent =
          marker.rowData["Org Name"] ||
          'Unnamed';

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

      organizationsSection.content
        .appendChild(tagSection);
    });

  // =====================================================
  // ARTISTS
  // =====================================================

  const artistsSection =
    createLegendSection('Artists');

  legend.appendChild(
    artistsSection.section
  );

  artistsSection.checkbox.addEventListener(
    'change',
    e => {

      artistsVisible =
        e.target.checked;

      const visibility =
        artistsVisible
          ? 'visible'
          : 'none';

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

        artistsSection.content
          .classList.remove('collapsed');

      }
    }
  );

  Object.keys(neighborhoodCounts)
    .sort()

    .forEach(neighborhood => {

      const row =
        document.createElement('div');

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

          visibleNeighborhoods
            .add(neighborhood);

        } else {

          visibleNeighborhoods
            .delete(neighborhood);

        }

        updateNeighborhoodFilters();
      });

      row.appendChild(checkbox);
      row.appendChild(label);

      artistsSection.content
        .appendChild(row);
    });
}

// =====================================================
// UPDATE ARTIST FILTERS
// =====================================================

function updateNeighborhoodFilters() {

  const selected =
    Array.from(visibleNeighborhoods);

  map.setFilter(
    'artist-fill-layer',
    [
      'in',
      ['get', 'ntaname'],
      ['literal', selected]
    ]
  );

  map.setFilter(
    'artist-outline-layer',
    [
      'in',
      ['get', 'ntaname'],
      ['literal', selected]
    ]
  );
}

// =====================================================
// SEARCH
// =====================================================

document
  .getElementById('search-input')
  .addEventListener('input', e => {

    const query =
      e.target.value
        .trim()
        .toLowerCase();

    const results =
      document.getElementById('search-results');

    results.innerHTML = '';

    if (!query) return;

    const matches =
      allMarkers.filter(marker => {

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

  // ORG LABELS

  allMarkers.forEach(marker => {

    if (!marker.labelElement) return;

    marker.labelElement.style.display =
      zoom >= 14 &&
      organizationsVisible
        ? 'block'
        : 'none';
  });

  // SUBWAY LABELS

  if (map.getLayer('subway-labels-layer')) {

    map.setLayoutProperty(
      'subway-labels-layer',
      'visibility',
      zoom >= 14
        ? 'visible'
        : 'none'
    );
  }
});

// =====================================================
// LOAD EVERYTHING
// =====================================================

map.on('load', async () => {

  // SUBWAY

  loadSubwayLayers();

  // ORGANIZATIONS

  const records =
    await fetchData();

  const orgData =
    records.map(r => ({
      id: r.id,
      ...r.fields
    }));

  createMarkers(orgData);

  // ARTISTS

  await loadArtistLayer();

  // LEGEND

  buildCombinedLegend();
});
