// api/fetch-orgs.js

if (req.method !== 'GET') {
  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  // Read the secret key from Vercel's environment variables
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = 'apppBx0a9hj0Z1ciw';
  const tableName = 'tblgqyoE5TZUzQDKw';

  const filterFormula = encodeURIComponent("{Approved}=TRUE()");
  const viewName = encodeURIComponent("main");
  
  let allRecords = [];
  let offset = null;

  try {
    do {
      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}?view=${viewName}&filterByFormula=${filterFormula}${offset ? `&offset=${offset}` : ''}`;

      const response = await fetch(airtableUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.statusText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    // Return the records to your frontend safely
    res.status(200).json(allRecords);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch organization data' });
  }
}