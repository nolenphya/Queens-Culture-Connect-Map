// Helper function to pause execution for a given number of milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async function handler(req, res) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = 'apppBx0a9hj0Z1ciw';
  const tableName = 'tblgqyoE5TZUzQDKw';

  let allRecords = [];
  let offset = null;

  try {
    do {
      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}${offset ? `?offset=${offset}` : ''}`;

      const response = await fetch(airtableUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable error: ${response.statusText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset || null;

      // Pause for 250ms between pages to stay under Airtable's 5 req/sec limit
      if (offset) {
        await sleep(250);
      }
    } while (offset);

    res.status(200).json(allRecords);
  } catch (error) {
    console.error('Error fetching org data:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch organization data' });
  }
};