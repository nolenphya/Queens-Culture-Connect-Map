
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = 'apppBx0a9hj0Z1ciw';

const ORGS_TABLE = 'tblgqyoE5TZUzQDKw';
const ARTISTS_TABLE = 'tbl9OiPT8QI8ss20e';

// Helper delay function to stay well under Airtable's 5 req/sec limit
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAllRecords(tableId) {
  let records = [];
  let offset = null;

  do {
    // 1. Pause 250ms before every fetch call so Airtable doesn't throw "Too Many Requests"
    await sleep(250);

    let url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${tableId}`;
    if (offset) {
      url += `?offset=${offset}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableId}: ${response.statusText}`);
    }

    const data = await response.json();
    records = records.concat(data.records);
    offset = data.offset;

  } while (offset);

  return records;
}

async function run() {
  if (!API_KEY) {
    console.error("Missing AIRTABLE_API_KEY environment variable.");
    process.exit(1);
  }

  try {
    console.log("Fetching Organizations...");
    const orgs = await fetchAllRecords(ORGS_TABLE);
    
    console.log("Fetching Artists...");
    await sleep(500); // Brief pause between table fetches
    const artists = await fetchAllRecords(ARTISTS_TABLE);

    // Format artists data to match your existing frontend expectations
    const formattedArtists = artists
      .map((r) => r.fields)
      .filter((f) => f && f["Artist Name"])
      .map((f) => ({
        ...f,
        Latitude: parseFloat(f.Latitude),
        Longitude: parseFloat(f.Longitude),
        NTA: f["NTA Code"] || f.NTA || "",
      }));

    // Format orgs data
    const formattedOrgs = orgs.map(r => ({
      id: r.id,
      ...r.fields
    }));

    // Ensure 'data' folder exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Save JSON files
    fs.writeFileSync(path.join(dataDir, 'orgs.json'), JSON.stringify(formattedOrgs, null, 2));
    fs.writeFileSync(path.join(dataDir, 'artists.json'), JSON.stringify(formattedArtists, null, 2));

    console.log(`Successfully updated data! (${formattedOrgs.length} orgs, ${formattedArtists.length} artists)`);
  } catch (error) {
    console.error("Error during sync:", error);
    process.exit(1);
  }
}

run();