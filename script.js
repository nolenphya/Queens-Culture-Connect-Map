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

const ARTIST_URL =
  `https://api.airtable.com/v0/${ARTIST_BASE_ID}/${ARTIST_TABLE_NAME}`;

// =====================================================
// GLOBALS
// =====================================================

let allMarkers = [];

let organizationsVisible = false;
let artistsVisible = false;

let organizationTagGroups = {};

const neighborhoodCounts = {};

let visibleNeighborhoods =
  new Set();

let artistNeighborhoodList = [];

const BASE_SOFTR_DIRECTORY =
  'https://elwanda52071.softr.app/artists';

// =====================================================
// ZIP → NTA LOOKUP
// =====================================================

const zipToNeighborhood = {

  "11101": "Long Island City-Hunters Point",
  "11102": "Old Astoria",
  "11103": "Astoria",
  "11104": "Astoria",
  "11105": "Astoria",
  "11106": "Old Astoria",

  "11354": "Downtown Flushing",
  "11355": "Downtown Flushing",
  "11358": "Queensboro Hill",
  "11361": "Bayside-Bayside Hills",
  "11362": "Douglaston-Little Neck",
  "11363": "Douglaston-Little Neck",

  "11364": "Oakland Gardens",
  "11365": "Fresh Meadows-Utopia",
  "11366": "Fresh Meadows-Utopia",
  "11367": "Pomonok-Flushing Heights-Hillcrest",

  "11368": "Corona",
  "11369": "East Elmhurst",
  "11370": "Astoria",

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
  "11413": "Springfield Gardens North",
  "11414": "Howard Beach",
  "11415": "Kew Gardens",

  "11416": "Ozone Park",
  "11417": "Ozone Park",
  "11418": "Richmond Hill",
  "11419": "South Richmond Hill",
  "11420": "South Ozone Park",

  "11421": "Woodhaven",
  "11422": "Rosedale",
  "11423": "Hollis",
  "11426": "Bellerose",

  "11427": "Queens Village",
  "11428": "Queens Village",
  "11429": "Queens Village",

  "11432": "Jamaica",
  "11433": "Jamaica",
  "11434": "Jamaica",
  "11435": "Jamaica",
  "11436": "South Jamaica",

  "11691": "Far Rockaway",
  "11692": "Hammels-Arverne-Edgemere",
  "11693": "Broad Channel",
  "11694": "Rockaway Park-Belle Harbor",
  "11697": "Breezy Point"
};

// =====================================================
// ICONS
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

  do {

    const fetchUrl =
      `${AIRTABLE_URL}?view=${viewName}&filterByFormula=${filterFormula}${offset ? `&offset=${offset}` : ''}`;

    const res = await fetch(fetchUrl, {
      headers: {
        Authorization:
          `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    const data = await res.json();

    allRecords =
      allRecords.concat(data.records || []);

    offset = data.offset || null;

  } while (offset);

  return allRecords;
}

// =====================================================
// FETCH ARTIST DATA
// =====================================================

async function fetchArtistData() {

  let records = [];
  let offset = null;

  do {

    const url =
      `${ARTIST_URL}${offset ? `?offset=${offset}` : ''}`;

    const res = await fetch(url, {
      headers: {
        Authorization:
          `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    const data = await res.json();

    records =
      records.concat(data.records || []);

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

    const lat =
      parseFloat(row.Latitude);

    const lng =
      parseFloat(row.Longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    const tags =
      (row.Tags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

    const primaryTag =
      tags[0] || 'Uncategorized';

    const iconKey =
      iconMap[primaryTag] || 'default';

    const el =
      document.createElement('div');

    el.style.backgroundImage =
      `url(icons/${iconKey}.png)`;

    el.style.width = '32px';
    el.style.height = '32px';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';

    el.style.display = 'none';

    const label =
      document.createElement('div');

    label.className = 'marker-label';

    label.innerText =
      row["Org Name"] || "Unnamed";

    label.style.display = 'none';

    el.appendChild(label);

    const popup =
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="max-width:250px;">
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

    tags.forEach(tag => {

      if (!organizationTagGroups[tag]) {
        organizationTagGroups[tag] = [];
      }

      organizationTagGroups[tag]
        .push(marker);
    });
  });
}

// =====================================================
// LOAD ARTIST CHOROPLETH
// =====================================================

async function loadArtistLayer() {

  const artists =
    await fetchArtistData();

  // RESET COUNTS

  Object.keys(neighborhoodCounts)
    .forEach(key => {
      delete neighborhoodCounts[key];
    });

  // =====================================================
  // BUILD COUNTS FROM ZIP
  // =====================================================

  artists.forEach(artist => {

    const zip =
      String(
        artist.Zip ||
        artist.ZIP ||
        ''
      ).trim();

    if (!zip) return;

    const ntaName =
      zipToNeighborhood[zip];

    if (!ntaName) return;

    if (!neighborhoodCounts[ntaName]) {
      neighborhoodCounts[ntaName] = 0;
    }

    neighborhoodCounts[ntaName]++;
  });

  // =====================================================
  // LOAD GEOJSON
  // =====================================================

  const response =
    await fetch('queens_neighborhoods.geojson');

  const geojson =
    await response.json();

  artistNeighborhoodList = [];

  geojson.features.forEach(feature => {

    const nta =
      feature.properties.ntaname?.trim();

    const count =
      neighborhoodCounts[nta] || 0;

    feature.properties.artist_count =
      count;

    if (count > 0) {

      artistNeighborhoodList.push(nta);

      visibleNeighborhoods.add(nta);
    }
  });

  // =====================================================
  // SOURCE
  // =====================================================

  if (!map.getSource('artists-nta')) {

    map.addSource('artists-nta', {
      type: 'geojson',
      data: geojson
    });

  } else {

    map.getSource('artists-nta')
      .setData(geojson);
  }

  // =====================================================
  // FILL
  // =====================================================

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

  // =====================================================
  // OUTLINES
  // =====================================================

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

  // =====================================================
  // HIDE INITIALLY
  // =====================================================

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

  // =====================================================
  // POPUPS
  // =====================================================

  map.on('click', 'artist-fill-layer', e => {

    const feature =
      e.features[0];

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

          <a
            href="${filterLink}"
            target="_blank"
          >
            View Artists
          </a>
        </div>
      `)
      .addTo(map);
  });

  map.on(
    'mouseenter',
    'artist-fill-layer',
    () => {
      map.getCanvas().style.cursor =
        'pointer';
    }
  );

  map.on(
    'mouseleave',
    'artist-fill-layer',
    () => {
      map.getCanvas().style.cursor =
        '';
    }
  );
}

// =====================================================
// SUBWAY LAYERS
// =====================================================

function loadSubwayLayers() {

  map.addSource('subway-lines', {
    type: 'geojson',
    data: 'nyc-subway-routes.geojson'
  });

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

  map.addSource('subway-stops', {
    type: 'geojson',
    data: 'nyc-subway-stops.geojson'
  });

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

// =====================================================
// LEGEND HELPERS
// =====================================================

function createLegendSection(title) {

  const section =
    document.createElement('div');

  section.className =
    'legend-section';

  const header =
    document.createElement('div');

  header.className =
    'legend-section-header';

  const arrow =
    document.createElement('span');

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
      e.target.tagName.toLowerCase()
      === 'input'
    ) {
      return;
    }

    content.classList.toggle(
      'collapsed'
    );

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
    document.getElementById(
      'legend-content'
    );

  legend.innerHTML = '';

  // =====================================================
  // ORGANIZATIONS
  // =====================================================

  const organizationsSection =
    createLegendSection(
      'Organizations'
    );

  legend.appendChild(
    organizationsSection.section
  );

  organizationsSection.checkbox
    .addEventListener(
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
      }
    );

  Object.entries(organizationTagGroups)
    .sort(([a], [b]) =>
      a.localeCompare(b)
    )

    .forEach(([tag, markers]) => {

      const category =
        document.createElement('div');

      const header =
        document.createElement('div');

      header.innerHTML =
        `<span class="arrow">▸</span> ${tag}`;

      header.className =
        'legend-category-header';

      const list =
        document.createElement('ul');

      list.style.display = 'none';

      header.addEventListener(
        'click',
        () => {

          const collapsed =
            list.style.display === 'none';

          list.style.display =
            collapsed
              ? 'block'
              : 'none';

          header.querySelector('.arrow')
            .textContent =
              collapsed
                ? '▾'
                : '▸';
        }
      );

      markers.forEach(marker => {

        const li =
          document.createElement('li');

        const checkbox =
          document.createElement('input');

        checkbox.type = 'checkbox';

        checkbox.checked = true;

        checkbox.addEventListener(
          'change',
          () => {

            marker.getElement().style.display =
              organizationsVisible &&
              checkbox.checked
                ? 'block'
                : 'none';
          }
        );

        const label =
          document.createElement('span');

        label.textContent =
          marker.rowData["Org Name"];

        label.className =
          'legend-link';

        label.addEventListener(
          'click',
          () => {

            map.flyTo({
              center:
                marker.getLngLat(),
              zoom: 15
            });

            marker.togglePopup();
          }
        );

        li.appendChild(checkbox);
        li.appendChild(label);

        list.appendChild(li);
      });

      category.appendChild(header);
      category.appendChild(list);

      organizationsSection.content
        .appendChild(category);
    });

  // =====================================================
  // ARTISTS
  // =====================================================

  const artistsSection =
    createLegendSection('Artists');

  legend.appendChild(
    artistsSection.section
  );

  artistsSection.checkbox
    .addEventListener(
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
      }
    );

  artistNeighborhoodList
    .sort()
    .forEach(neighborhood => {

      const row =
        document.createElement('div');

      row.className =
        'legend-item-row';

      const checkbox =
        document.createElement('input');

      checkbox.type = 'checkbox';

      checkbox.checked = true;

      checkbox.addEventListener(
        'change',
        () => {

          if (checkbox.checked) {

            visibleNeighborhoods
              .add(neighborhood);

          } else {

            visibleNeighborhoods
              .delete(neighborhood);
          }

          updateNeighborhoodFilters();
        }
      );

      const label =
        document.createElement('label');

      label.textContent =
        neighborhood;

      row.appendChild(checkbox);
      row.appendChild(label);

      artistsSection.content
        .appendChild(row);
    });
}

// =====================================================
// FILTER ARTISTS
// =====================================================

function updateNeighborhoodFilters() {

  const selected =
    Array.from(
      visibleNeighborhoods
    );

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
      document.getElementById(
        'search-results'
      );

    results.innerHTML = '';

    if (!query) return;

    const matches =
      allMarkers.filter(marker => {

        const name =
          (
            marker.rowData["Org Name"]
            || ''
          ).toLowerCase();

        return name.includes(query);
      });

    matches.forEach(marker => {

      const div =
        document.createElement('div');

      div.className =
        'search-result';

      div.textContent =
        marker.rowData["Org Name"];

      div.addEventListener(
        'click',
        () => {

          map.flyTo({
            center:
              marker.getLngLat(),
            zoom: 15
          });

          marker.togglePopup();
        }
      );

      results.appendChild(div);
    });
  });

// =====================================================
// ZOOM LABELS
// =====================================================

map.on('zoom', () => {

  const zoom =
    map.getZoom();

  allMarkers.forEach(marker => {

    if (!marker.labelElement) {
      return;
    }

    marker.labelElement.style.display =
      zoom >= 14 &&
      organizationsVisible
        ? 'block'
        : 'none';
  });

  if (
    map.getLayer(
      'subway-labels-layer'
    )
  ) {

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

  loadSubwayLayers();

  const records =
    await fetchData();

  const orgData =
    records.map(r => ({
      id: r.id,
      ...r.fields
    }));

  createMarkers(orgData);

  await loadArtistLayer();

  buildCombinedLegend();
});