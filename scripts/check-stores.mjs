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
  const res = await client.query(`
    SELECT id, name, address, latitude, longitude 
    FROM public.stores;
  `);
  console.log('Stores in database:');
  console.log(res.rows);
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
