import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'DATABASE_URL not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT payload FROM digest_editions
      ORDER BY digest_date DESC, generated_at DESC
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ error: 'No digest available yet' });
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(rows[0].payload);
  } catch (err) {
    console.error('[api/digest/today]', err.message);
    res.status(500).json({ error: 'Database error' });
  }
}
