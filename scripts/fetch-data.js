const fs = require('fs');
const path = require('path');

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appirTxnn4ahpwSuk';

const ORGS_TABLE = 'tblgqyoE5TZUzQDKw';
const ARTISTS_TABLE = 'tbl9OiPT8QI8ss20e';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In scripts/fetch-data.js, update fetchAllRecords or add filter parameter:

async function fetchAllRecords(tableId, filterFormula = '') {
  let records = [];
  let offset = null;

  const PROXY_URL = "https://airtable-proxy.nolen-scruggs.workers.dev";

  do {
    let url = `${PROXY_URL}/v0/${BASE_ID}/${tableId}`;
    let params = [];
    
    if (offset) params.push(`offset=${offset}`);
    if (filterFormula) params.push(`filterByFormula=${encodeURIComponent(filterFormula)}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableId}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    records = records.concat(data.records);
    offset = data.offset;

  } while (offset);

  return records;
}

// Then in your run() function:
console.log("Fetching Organizations...");
// Adjust '{Status} = "Approved"' to match your exact column name & option in Airtable
const orgs = await fetchAllRecords(ORGS_TABLE, '{Status} = "Approved"');
async function run() {
  try {
    console.log("Fetching Organizations...");
    const orgs = await fetchAllRecords(ORGS_TABLE);
    
    console.log("Fetching Artists...");
    await sleep(500);
    const artists = await fetchAllRecords(ARTISTS_TABLE);

    // Format artists safely
    const formattedArtists = artists
      .map((r) => r.fields)
      .filter((f) => f && (f["Full Name"] || f["Artist Display Name"]))
      .map((f) => ({
        ...f,
        Latitude: f.Latitude ? parseFloat(f.Latitude) : null,
        Longitude: f.Longitude ? parseFloat(f.Longitude) : null,
        NTA: f["NTA Code"] || f.NTA || f.NTA_Map || "",
      }));

    // Format orgs data
    const formattedOrgs = orgs.map(r => ({
      id: r.id,
      ...r.fields
    }));

    // Ensure 'data' directory exists relative to project root
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write both files
    fs.writeFileSync(path.join(dataDir, 'orgs.json'), JSON.stringify(formattedOrgs, null, 2));
    fs.writeFileSync(path.join(dataDir, 'artists.json'), JSON.stringify(formattedArtists, null, 2));

    console.log(`✅ Successfully updated data files! Saved ${formattedOrgs.length} orgs to data/orgs.json and ${formattedArtists.length} artists to data/artists.json`);
  } catch (error) {
    console.error("❌ Error during sync:", error);
    process.exit(1);
  }
}


run();