import pg from 'pg';
import { readFileSync, existsSync } from 'fs';

let envPassword = process.env.SUPABASE_DB_PASSWORD;
if (!envPassword && existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf8');
  const match = envContent.match(/^SUPABASE_DB_PASSWORD\s*=\s*["']?([^"'\s#]+)["']?/m);
  if (match) {
    envPassword = match[1];
  }
}

const clientConfig = {
  host: 'db.bxhnlwkhoeeqpifqvqxs.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: envPassword,
  ssl: { rejectUnauthorized: false },
};

const client = new pg.Client(clientConfig);
await client.connect();

try {
  const storeOwner = '78b84612-ec77-4d5b-820f-1be2076d2e06'; // Chat Gpt (store owner)
  console.log(`Mocking query as store owner: ${storeOwner}`);
  
  await client.query('BEGIN');
  
  // Set current user ID setting so auth.uid() returns the store owner
  await client.query(`
    SELECT set_config('request.jwt.claim.sub', $1, true);
  `, [storeOwner]);
  
  try {
    const res = await client.query(`
      SELECT * FROM public.orders;
    `);
    console.log('Query succeeded! Total orders fetched:', res.rows.length);
    console.log(res.rows);
  } catch (qErr) {
    console.error('Query failed with error:');
    console.error(qErr.message);
  } finally {
    await client.query('ROLLBACK');
  }
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
