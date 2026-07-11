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

const sql = readFileSync('supabase/migrations/035_fix_triggers_for_insert.sql', 'utf8');

try {
  await client.connect();
  await client.query(sql);
  console.log('✅ Migration 035 applied successfully');
} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  await client.end();
}
