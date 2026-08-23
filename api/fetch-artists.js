// Helper function to pause execution for a given number of milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async function handler(req, res) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = 'apppBx0a9hj0Z1ciw';
  const tableName = 'tbl9OiPT8QI8ss20e';

  let records = [];
  let offset = null;

  try {
    do {
      const url = `https://api.airtable.com/v0/${baseId}/${tableName}${offset ? `?offset=${offset}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable error: ${response.statusText}`);
      }

      const data = await response.json();
      records = records.concat(data.records || []);
      offset = data.offset || null;

      // If there are more pages, pause for 250ms before the next request
      if (offset) {
        await sleep(300);
      }
    } while (offset);

    // Return full record objects so script.js can parse fields
    res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching artist data:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch artist data' });
  }
};