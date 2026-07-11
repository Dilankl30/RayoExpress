import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
const pw = env.match(/SUPABASE_DB_PASSWORD=(.+)/)?.[1]?.trim();
const projRef = env.match(/VITE_SUPABASE_URL=https:\/\/([^.]+)/)?.[1];

const client = new pg.Client({
  host: `db.${projRef}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: pw,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync('supabase/migrations/034_notification_metadata.sql', 'utf8');

try {
  await client.connect();
  await client.query(sql);
  console.log('✅ Migration 034 applied successfully');
  
  // Verify the column exists now
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications'
    ORDER BY ordinal_position
  `);
  console.log('\nColumns in notifications:');
  res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
  
} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  await client.end();
}
