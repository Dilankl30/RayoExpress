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
    UPDATE public.stores
    SET address = 'Calle Napo y General Villamil, El Coca',
        latitude = -0.4630,
        longitude = -76.9890
    WHERE id = '868e31eb-f6ad-4a04-9d06-18474a7f1af5';
  `);
  console.log('Update result:', res.rowCount, 'row(s) updated.');
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
