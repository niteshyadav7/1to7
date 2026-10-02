const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/POSTGRES_URL=([^\r\n]+)/);
const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    const otps = await client.query(`
      SELECT mobile, created_at
      FROM public.otps
      WHERE created_at >= '2026-10-01 15:00:00'
      ORDER BY created_at ASC;
    `);
    console.log('OTPs around that time:');
    console.table(otps.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
