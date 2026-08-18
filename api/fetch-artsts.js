// api/fetch-artists.js

export default async function handler(req, res) {
  const apiKey = process.env.AIRTABLE_API_KEY; // Read safely from Vercel env
  const baseId = 'apppBx0a9hj0Z1ciw';
  const tableName = 'tbl9OiPT8QI8ss20e'; // Artists table ID

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

    res.status(200).json(records.map(r => r.fields));
  } catch (error) {
    console.error('Error fetching artist data:', error);
    res.status(500).json({ error: 'Failed to fetch artist data' });
  }
}