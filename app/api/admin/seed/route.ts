import { NextResponse } from 'next/server';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

export async function POST() {
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json({ success: false, error: 'POSTGRES_URL is missing' }, { status: 500 });
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    
    // 1. Seed Admin
    const adminSql = `
      INSERT INTO public.admins (email, password_hash)
      VALUES ('admin@gmail.com', '$2b$10$dP28kx9QifukOfwQHn9qFuxnX9gS1RHmCQ/u02/Sv6vqQ3Oyxl2Ju')
      ON CONFLICT (email) DO NOTHING;
    `;
    await client.query(adminSql);

    // 2. Seed Campaigns
    const sqlPath = path.join(process.cwd(), 'supabase', 'seed-campaigns.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
    }

    return NextResponse.json({ success: true, message: 'Database seeded successfully (Admin & Campaigns)!' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    await client.end();
  }
}
