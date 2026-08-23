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
      
      let response;
      let retries = 0;
      const maxRetries = 5;

      // Handle rate limits gracefully with internal retries
      while (retries < maxRetries) {
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (response.status === 429) {
          // If rate limited, wait longer before retrying this specific request
          console.warn(`Airtable rate limited (429). Retrying in ${(retries + 1) * 1000}ms...`);
          await sleep((retries + 1) * 1000);
          retries++;
        } else {
          break; // Not a rate limit error, proceed
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      records = records.concat(data.records || []);
      offset = data.offset || null;

      // Standard pause between normal successful pages (400ms = max ~2.5 req/sec)
      if (offset) {
        await sleep(400);
      }
    } while (offset);

    res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching artist data:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch artist data' });
  }
};