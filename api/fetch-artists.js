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
    } while (offset);

    // Return full record objects so script.js can parse fields
    res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching artist data:', error);
    res.status(500).json({ error: 'Failed to fetch artist data' });
  }
};