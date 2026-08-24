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

//Add Navigation control
map.addControl(
  new mapboxgl.NavigationControl({
    showCompass: true
  }),
  'top-right'
);

// Add Geolocate/Self-Locate Control
map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true,
    showUserHeading: true
  }),
  'top-right'
);


// Smooth zooming

map.scrollZoom.setWheelZoomRate(1 / 450);
map.scrollZoom.setZoomRate(1 / 150);

// smoother feel

map.dragPan.enable();
map.touchZoomRotate.enable();

// =====================================================
// AIRTABLE SETUP
// =====================================================

//const AIRTABLE_API_KEY = 'patboskAQTJUi9FlQ.1c30c3c632cd4d7bd03cf949e50edd922425aba8dcbf0c8a6002e98db67c74a3';

//const BASE_ID =
  //'apppBx0a9hj0Z1ciw';

//const TABLE_NAME =
 //'tblgqyoE5TZUzQDKw';

//const AIRTABLE_URL =
 // `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

// =====================================================
// ARTIST AIRTABLE
// =====================================================


//const ARTIST_BASE_ID = 'apppBx0a9hj0Z1ciw';
//const ARTIST_TABLE_NAME = 'tbl9OiPT8QI8ss20e';

//const ARTIST_URL =
 // `https://api.airtable.com/v0/${ARTIST_BASE_ID}/${ARTIST_TABLE_NAME}`;

// =====================================================
// GLOBALS
// =====================================================

let allMarkers = [];

let organizationsVisible = true;
let artistsVisible = true;

let organizationTagGroups = {};

const neighborhoodCounts = {};

let visibleNeighborhoods =
  new Set();

let artistNeighborhoodList = [];

let hoveredNtaId = null;

const BASE_SOFTR_DIRECTORY =
  "https://elwanda52071.softr.app";

const ORG_PROFILE_URL =
  `${BASE_SOFTR_DIRECTORY}/organization-details`;

const ARTIST_DIRECTORY_URL =
  `${BASE_SOFTR_DIRECTORY}/artists`;

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

  const tagColors = {

  // Blue (A/C/E)
  'Gallery': '#0039A6',
  // Orange (B/D/F/M)
  'Museum/Cultural Institution': '#FF6319',
  // Yellow (N/Q/R/W)
  'Music Group/Vocal Ensembles': '#FCCC0A',
  // Green (4/5/6)
  'Community Garden': '#00933C',
  // Red (1/2/3)
  'Theatre': '#EE352E',
  // Purple (7)
  'Dance Company': '#B933AD',
  // Teal (custom, complements MTA palette)
  'Art Center-Studio': '#00A9B7',
  // Dark Navy
  'Cultural Arts Center': '#1B365D',
  // Brown (J/Z)
  'Historical Society-Preservation Group': '#996633',
  // Light Green (G)
  'Community Center': '#6CBE45',
  // Gray (L)
  'Multidisciplinary Arts Center': '#A7A9AC',
  // Cyan (custom)
  'Video-Film Company': '#00B7C7'
};



// =====================================================
// FETCH ORGANIZATION DATA (Static JSON)
// =====================================================
async function fetchData() {
  try {
    const res = await fetch('./data/orgs.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const allRecords = await res.json();
    return allRecords;
  } catch (error) {
    console.error('Failed to load static orgs data:', error);
    return [];
  }
}

// =====================================================
// FETCH ARTIST DATA (Static JSON)
// =====================================================
async function fetchArtistData() {
  try {
    const res = await fetch('./data/artists.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const records = await res.json();
    return records;
  } catch (error) {
    console.error('Failed to load static artist data:', error);
    return [];
  }
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


    el.style.backgroundColor = '#007bff';
    el.style.borderRadius = '50%';

   const img = document.createElement('img');

img.src = `icons/${iconKey}.png`;

img.style.width = '20px';
img.style.height = '20px';

img.style.position = 'absolute';
img.style.top = '50%';
img.style.left = '50%';
img.style.transform =
  'translate(-50%, -50%)';

img.style.pointerEvents = 'none';

el.appendChild(img);

  el.style.backgroundColor =
  tagColors[primaryTag] || '#444';

el.style.width = '36px';
el.style.height = '36px';
el.style.borderRadius = '50%';

el.style.backgroundColor =
  tagColors[primaryTag] || '#666';

el.style.border = '2px solid white';

el.style.boxShadow =
  '0 1px 4px rgba(0,0,0,0.35)';

   // el.addEventListener('click', (event) => {
 // event.stopPropagation();
//});

el.style.transition =
    "transform .18s ease, filter .18s ease";

el.addEventListener('mouseenter', () => {

    el.style.transform =
        'translateY(-4px) scale(1.18)';

    el.style.filter =
        'drop-shadow(0 8px 18px rgba(0,0,0,.25))';

    el.style.zIndex = 999;

});

el.addEventListener('mouseleave', () => {

    el.style.transform =
        'translateY(0) scale(1)';

    el.style.filter = 'none';

    el.style.zIndex = '';

});

    el.style.display =
  organizationsVisible
    ? 'block'
    : 'none';

    const label =
      document.createElement('div');

    label.className = 'marker-label';

    label.innerText =
      row["Org Name"] || "Unnamed";

    label.style.display = 'none';
    label.style.pointerEvents = 'none';
    el.appendChild(label);

 const orgLink =
  `${ORG_PROFILE_URL}?recordId=${row.id}`;
  
    const imageUrl = Array.isArray(row.Image) && row.Image.length > 0 ? row.Image[0].url : '';


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
        row.Tagline
          ? `<p>${row.Tagline}</p>`
          : ''
      }

      ${
        row.Address
          ? `<p><b>Address:</b><br>${row.Address}</p>`
          : ''
      }

      <p style="margin-top:10px;">
        <a
          href="${orgLink}"
          target="_blank"
        >
          View Organization Profile
        </a>
      </p>

    </div>
  `);

    const marker =
  new mapboxgl.Marker(el)
    .setLngLat([lng, lat])
    .setPopup(popup)
    .addTo(map);

el.addEventListener('click', () => {
  //console.log('MARKER CLICK:', row["Org Name"]);
  marker.togglePopup();
});

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

  let nta = artist.NTA_Map;

  // Airtable lookup / linked fields sometimes come back as arrays
  if (Array.isArray(nta)) {
    nta = nta[0];
  }

  nta = nta?.trim();

  if (!nta) return;

  if (!neighborhoodCounts[nta]) {
    neighborhoodCounts[nta] = 0;
  }

  neighborhoodCounts[nta]++;
});

console.log("Neighborhood counts:", neighborhoodCounts);
  // =====================================================
  // LOAD GEOJSON
  // =====================================================

  const response =
    await fetch('queens_neighborhoods.geojson');

  const geojson =
    await response.json();

 // =====================================================
  // PROCESS GEOJSON & BUILD UNIQUE NEIGHBORHOOD LIST
  // =====================================================

  const uniqueNTAs = new Set();

  geojson.features.forEach((feature, index) => {
    feature.id = index; // Ensure each feature has a unique numeric ID for hover effects

    const nta = feature.properties.ntaname?.trim();
    if (!nta) return;

    const count = neighborhoodCounts[nta] || 0;
    feature.properties.artist_count = count;

    // Track unique names and default all to visible
    uniqueNTAs.add(nta);
    visibleNeighborhoods.add(nta);
  });

  // Convert Set to a clean, sorted array with NO duplicates
  artistNeighborhoodList = Array.from(uniqueNTAs).sort();

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

          0,  '#ffffff', // 0 artists (White)
  1,  '#f0f0f0',
  3,  '#d9d9d9',
  5,  '#bdbdbd',
  8,  '#969696',
  12, '#737373',
  16, '#525252',
  20, '#252525',
  30, '#000000'  // 30+ artists (Black)
        ],

        'fill-opacity': [
  'case',
  ['boolean', ['feature-state', 'hover'], false],
  0.95,
  0.45
]
      }
    });
  }

  map.on('mousemove', 'artist-fill-layer', (e) => {

  if (!e.features.length) return;

  if (hoveredNtaId !== null) {

    map.setFeatureState(
      {
        source: 'artists-nta',
        id: hoveredNtaId
      },
      {
        hover: false
      }
    );
  }

  hoveredNtaId = e.features[0].id;

  map.setFeatureState(
    {
      source: 'artists-nta',
      id: hoveredNtaId
    },
    {
      hover: true
    }
  );
});

map.on('mouseleave', 'artist-fill-layer', () => {

  if (hoveredNtaId !== null) {

    map.setFeatureState(
      {
        source: 'artists-nta',
        id: hoveredNtaId
      },
      {
        hover: false
      }
    );
  }

  hoveredNtaId = null;
});



  // =====================================================
  // OUTLINES
  // =====================================================

  if (!map.getLayer('artist-outline-layer')) {
    map.addLayer({
      id: 'artist-outline-layer',
      type: 'line',
      source: 'artists-nta',
      paint: {
        // Outline brightens and thickens drastically on hover
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#dfe300', // Vibrant iOS Yellow border on hover
          '#222222'  // Dark default border
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          4,   // Bold 4px border when hovered
          1.5  // 1.5px default
        ],
        'line-opacity': 1.0
      }
    });
  }
  // =====================================================
  // OPEN INITIALLY
  // =====================================================

map.setLayoutProperty(
  'artist-fill-layer',
  'visibility',
  artistsVisible
    ? 'visible'
    : 'none'
);

map.setLayoutProperty(
  'artist-outline-layer',
  'visibility',
  artistsVisible
    ? 'visible'
    : 'none'
);

  // =====================================================
  // POPUPS
  // =====================================================

  map.on('click', 'artist-fill-layer', e => {

const clickedMarker =
  e.originalEvent.target.closest('.mapboxgl-marker');

if (clickedMarker) return;

    const feature =
      e.features[0];

    const name =
      feature.properties.ntaname;

    const count =
      feature.properties.artist_count || 0;

    const filterLink =
      `${ARTIST_DIRECTORY_URL}?filter-by-Neighborhood_Lookup=${encodeURIComponent(name)}`;

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
  const section = document.createElement('div');
  section.className = 'legend-section';

  const header = document.createElement('div');
  header.className = 'legend-section-header legend-main-header';

  const arrow = document.createElement('span');
  arrow.className = 'legend-arrow';
  arrow.textContent = '▼'; // Default to down arrow

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;

  const label = document.createElement('label');
  label.textContent = title;

  const content = document.createElement('div');
  // Start collapsed natively by max-height rather than display:none
  content.className = 'legend-section-content';
  content.style.maxHeight = 'none'; 
  content.style.overflow = 'hidden';
  content.style.transition = 'max-height 0.35s ease';

  header.appendChild(arrow);
  header.appendChild(checkbox);
  header.appendChild(label);
  section.appendChild(header);
  section.appendChild(content);

  header.addEventListener('click', e => {
    // Prevent collapsing the accordion if the user just clicked the checkbox
    if (e.target.tagName.toLowerCase() === 'input') {
      return;
    }

    const isCollapsed = content.style.maxHeight === '0px' || content.style.maxHeight === '';
    
    if (isCollapsed) {
      arrow.textContent = '▼';
      content.style.maxHeight = content.scrollHeight + "px";
      // Handle variable height if inner sub-menus open later
      setTimeout(() => { content.style.maxHeight = 'none'; }, 350);
    } else {
      arrow.textContent = '▶';
      content.style.maxHeight = content.scrollHeight + "px";
      reflow(); // force layout calculation
      content.style.maxHeight = "0px";
    }
  });

  function reflow() { content.offsetHeight; }

  return {
    section,
    content,
    checkbox
  };
}

// =====================================================
// BUILD LEGEND
// =====================================================

console.log(
  'Markers:',
  allMarkers.length
);

console.log(
  'Neighborhood counts:',
  neighborhoodCounts
);

// =====================================================
// BUILD LEGEND
// =====================================================

function buildCombinedLegend() {
  const legend =
    document.getElementById("legend-content");

legend.innerHTML = "";

const title = document.createElement("div");
title.className = "layers-title";

title.innerHTML = `
    <span>☰</span>
    <span>Layers</span>
`;

legend.appendChild(title);

  // =====================================================
  // ORGANIZATIONS SECTION
  // =====================================================
  const orgCount = allMarkers.length;

const organizationsSection =
    createLegendSection(
        `Organizations (${orgCount})`
    );
  legend.appendChild(organizationsSection.section);

  // Sync the master toggle state
  organizationsSection.checkbox.checked = organizationsVisible;

  organizationsSection.checkbox.addEventListener('change', e => {
    organizationsVisible = e.target.checked;

    // 1. Forcefully update all nested item checkboxes in the DOM
    organizationsSection.content.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = organizationsVisible;
    });

    // 2. Map marker visibility toggle
    allMarkers.forEach(marker => {
      marker.getElement().style.display = organizationsVisible ? 'block' : 'none';
    });
  });
 

  // Populate organization items
 // Populate organization items
  Object.entries(organizationTagGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([tag, markers]) => {
      const category = document.createElement('div');
      const header = document.createElement('div');

      const leftContainer = document.createElement('div');
      leftContainer.style.display = 'flex';
      leftContainer.style.alignItems = 'center';

      const colorDot = document.createElement('span');
      colorDot.style.background = tagColors[tag] || '#666';
      colorDot.style.width = '12px';
      colorDot.style.height = '12px';
      colorDot.style.borderRadius = '50%';
      colorDot.style.display = 'inline-block';
      colorDot.style.marginRight = '6px';

      const textNode = document.createElement('span');
      textNode.textContent = tag;

      leftContainer.appendChild(colorDot);
      leftContainer.appendChild(textNode);

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'arrow';
      arrowSpan.textContent = '▸';

      header.appendChild(leftContainer);
      header.appendChild(arrowSpan);

      header.className = 'legend-category-header';

      const list = document.createElement('ul');
      list.style.display = 'none';

      header.addEventListener('click', () => {
        const collapsed = list.style.display === 'none';
        list.style.display = collapsed ? 'block' : 'none';
        header.querySelector('.arrow').textContent = collapsed ? '▾' : '▸';
      });

      markers.forEach(marker => {
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;

        checkbox.addEventListener('change', () => {
          marker.getElement().style.display = organizationsVisible && checkbox.checked ? 'block' : 'none';
        });

        const label = document.createElement('span');
        label.textContent = marker.rowData["Org Name"];
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

      category.appendChild(header);
      category.appendChild(list);
      organizationsSection.content.appendChild(category);
    });

  // =====================================================
  // ARTISTS SECTION
  // =====================================================
const artistTotal =
    Object.values(neighborhoodCounts)
        .reduce(
            (a,b)=>a+b,
            0
        );

const artistsSection =
    createLegendSection(
        `Artists (${artistTotal})`
    );
  legend.appendChild(artistsSection.section);

  // Sync the master toggle state safely now that it is declared
  artistsSection.checkbox.checked = artistsVisible;

artistsSection.checkbox.addEventListener('change', e => {
    artistsVisible = e.target.checked;

    // 1. Synchronize nested neighborhood UI checkboxes visually
    artistsSection.content.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = artistsVisible;
    });

    // 2. Switch layer visibility
    const visibility = artistsVisible ? 'visible' : 'none';
    if (map.getLayer('artist-fill-layer')) {
      map.setLayoutProperty('artist-fill-layer', 'visibility', visibility);
    }
    if (map.getLayer('artist-outline-layer')) {
      map.setLayoutProperty('artist-outline-layer', 'visibility', visibility);
    }

    /* ==========================================================
       TOGGLE CHOROPLETH LEGEND DYNAMICALLY
       ========================================================== */
    const legendEl = document.querySelector('.choropleth-legend');
    if (legendEl) {
      legendEl.style.display = artistsVisible ? 'flex' : 'none';
    }
  });

  // Populate artist neighborhood filters
 // Populate artist neighborhood filters
 // Populate artist neighborhood filters (Unique list)
  artistNeighborhoodList
    .filter(neighborhood => (neighborhoodCounts[neighborhood] || 0) > 0) // Keeps UI clean (only shows neighborhoods with artists)
    .forEach(neighborhood => {
      const row = document.createElement('div');
      row.className = 'legend-item-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = visibleNeighborhoods.has(neighborhood);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          visibleNeighborhoods.add(neighborhood);
        } else {
          visibleNeighborhoods.delete(neighborhood);
        }
        updateNeighborhoodFilters();
      });

      const labelLink = document.createElement('span');
      labelLink.className = 'legend-link';
      labelLink.style.marginLeft = '4px';
      labelLink.innerHTML = `${neighborhood} <span class="legend-count">(${neighborhoodCounts[neighborhood] || 0})</span>`;

      // Click to fly/zoom straight to the neighborhood boundary
     // Click to fly/zoom straight to the neighborhood boundary and open its popup
      labelLink.addEventListener('click', () => {
        // Query the underlying source so it works even if the polygon is off-screen
        const sourceFeatures = map.querySourceFeatures('artists-nta', {
          sourceLayer: 'artist-fill-layer'
        });

        // Find the feature matching the clicked neighborhood
        const match = sourceFeatures.find(
          f => f.properties.ntaname?.trim() === neighborhood
        );

        if (match) {
          const bounds = new mapboxgl.LngLatBounds();

          // Calculate bounding box across Polygon or MultiPolygon geometries
          if (match.geometry.type === 'Polygon') {
            match.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
          } else if (match.geometry.type === 'MultiPolygon') {
            match.geometry.coordinates.forEach(poly => {
              poly[0].forEach(coord => bounds.extend(coord));
            });
          }

          const center = bounds.getCenter();

          // Smoothly fly to the neighborhood
          map.fitBounds(bounds, {
            padding: 80,
            maxZoom: 14,
            duration: 1200
          });

          // Open popup at the center of the neighborhood
          const name = match.properties.ntaname;
          const count = match.properties.artist_count || 0;
          const filterLink = `${ARTIST_DIRECTORY_URL}?filter-by-Neighborhood_Lookup=${encodeURIComponent(name)}`;

          new mapboxgl.Popup()
            .setLngLat(center)
            .setHTML(`
              <div style="max-width:220px; font-family: sans-serif;">
                <h3 style="margin-bottom: 6px; font-size: 15px; font-weight: 600;">${name}</h3>
                <p style="margin-bottom: 10px; color: #48484a; font-size: 13px;">
                  ${count} artist${count === 1 ? '' : 's'}
                </p>
                <a
                  href="${filterLink}"
                  target="_blank"
                  style="color: #0071e3; font-weight: 600; text-decoration: none; font-size: 13px;"
                >
                  View Artists
                </a>
              </div>
            `)
            .addTo(map);
        }
      });

      row.appendChild(checkbox);
      row.appendChild(labelLink);
      artistsSection.content.appendChild(row);
    });
}

// =====================================================
// FILTER ARTISTS
// =====================================================

function updateNeighborhoodFilters() {
  const selected = Array.from(visibleNeighborhoods);

  // If nothing is selected, hide all neighborhood shapes
  if (selected.length === 0) {
    map.setFilter('artist-fill-layer', ['==', ['get', 'ntaname'], '']);
    map.setFilter('artist-outline-layer', ['==', ['get', 'ntaname'], '']);
    return;
  }

  // Create an 'in' filter checking if 'ntaname' is in the selected list
  const filterExpression = ['in', ['get', 'ntaname'], ['literal', selected]];

  map.setFilter('artist-fill-layer', filterExpression);
  map.setFilter('artist-outline-layer', filterExpression);
}

// =====================================================
// SEARCH
// =====================================================

// =====================================================
// SEARCH (Supports Name & Neighborhood)
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
        // 1. Get the organization name
        const name = (marker.rowData["Org Name"] || '').toLowerCase();

        // 2. Extract zip code from the address to determine its neighborhood
        const address = marker.rowData["Address"] || '';
        const zipMatch = address.match(/\b(11\d{3})\b/); // Regex to find Queens zip codes (11xxx)
        
        let neighborhood = '';
        if (zipMatch && zipMatch[1]) {
          const zip = zipMatch[1];
          neighborhood = (zipToNeighborhood[zip] || '').toLowerCase();
        }

        // 3. Return true if the query matches either the name OR the neighborhood
        return name.includes(query) || neighborhood.includes(query);
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
            center: marker.getLngLat(),
            zoom: 15,
            speed: .8,
            curve: 1.45,
            essential: true
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
// PHASE 1 UI & WINDOW HANDLERS (CLEANED UP)
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const searchInput = document.getElementById("search-input");
    const infoButton = document.getElementById("info-button");
    const closeGuide = document.getElementById("map-guide-close");
    const guideOverlay = document.getElementById("map-guide-overlay");

    // -----------------------------------------
    // Panel Collapse / Expand Controls
    // -----------------------------------------
    sidebarToggle.addEventListener("click", () => {
        const isCollapsed = sidebar.classList.toggle("collapsed");
        sidebarToggle.innerHTML = isCollapsed ? "☰" : "←";
    });

    // Automatically expand card when typing in search
    searchInput.addEventListener("focus", () => {
        if (sidebar.classList.contains("collapsed")) {
            sidebar.classList.remove("collapsed");
            sidebarToggle.innerHTML = "←";
        }
    });

    // -----------------------------------------
    // About Guide Overlay Modal
    // -----------------------------------------
    infoButton.addEventListener("click", (e) => {
        e.stopPropagation();
        guideOverlay.style.display = "flex";
    });

    closeGuide.addEventListener("click", () => {
        guideOverlay.style.display = "none";
    });

    // Close window if clicked on background blur environment
    guideOverlay.addEventListener("click", (e) => {
        if (e.target === guideOverlay) {
            guideOverlay.style.display = "none";
        }
    });
});

// Close interactive bottom card on mobile when user repositions map
map.on("click", () => {
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById("sidebar");
        const sidebarToggle = document.getElementById("sidebar-toggle");
        if (sidebar && !sidebar.classList.contains("collapsed")) {
            sidebar.classList.add("collapsed");
            sidebarToggle.innerHTML = "☰";
        }
    }
});



// Custom Mapbox Control for the Artist Density Legend
// =====================================================
// BOTTOM-RIGHT MAP CONTROLS
// =====================================================
// =====================================================
// INITIALIZATION AND BOTTOM-RIGHT MAP CONTROLS
// =====================================================

class ChoroplethLegendControl {
  onAdd(map) {
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl choropleth-legend';
    this._container.innerHTML = `
      <div class="legend-title">Artists per Neighborhood</div>
      <div class="legend-scale-bar"></div>
      <div class="legend-labels">
        <span>0</span>
        <span>10</span>
        <span>20</span>
        <span>30+</span>
      </div>
    `;
    return this._container;
  }
  onRemove() {
    this._container.parentNode.removeChild(this._container);
  }
}

map.on('load', async () => {
  // 1. Scale Control & Choropleth Legend
  const scale = new mapboxgl.ScaleControl({
    maxWidth: 100,
    unit: 'imperial'
  });
  map.addControl(scale, 'bottom-right');

  const choroplethLegend = new ChoroplethLegendControl();
  map.addControl(choroplethLegend, 'bottom-right');

  try {
    // 2. Load static JSON data in parallel (lightning fast!)
    const [orgRecords] = await Promise.all([
      fetchData(),
      loadArtistLayer()
    ]);

    // 3. Render Organization Markers
    createMarkers(orgRecords);

    // 4. Draw subways on top
    loadSubwayLayers(); 

    // 5. Build combined sidebar legend
    buildCombinedLegend();

  } catch (error) {
    console.error("Error loading map layers:", error);
  }
});

// Close interactive bottom card on mobile when user repositions map
map.on("dragstart", () => {
  const sidebar = document.getElementById("sidebar");
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.add("collapsed");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    if (sidebarToggle) sidebarToggle.innerHTML = "☰";
  }
});