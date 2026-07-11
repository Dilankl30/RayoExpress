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
  const storeId = '868e31eb-f6ad-4a04-9d06-18474a7f1af5'; // Tienda Cardenas
  const mockUser = '78b84612-ec77-4d5b-820f-1be2076d2e06'; // Chat Gpt (store owner)
  
  await client.query('BEGIN');
  await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [mockUser]);
  
  // 1. Test getStoreDashboardStats query components (WITHOUT rating query)
  console.log('--- Testing stats queries ---');
  try {
    const sales = await client.query(`SELECT total FROM public.orders WHERE store_id = $1 AND status = 'delivered';`, [storeId]);
    console.log('Sales query succeeded:', sales.rows);
  } catch (e) {
    console.error('Sales query failed:', e.message);
  }
  
  try {
    const active = await client.query(`SELECT COUNT(*) FROM public.orders WHERE store_id = $1 AND status IN ('pending', 'accepted', 'preparing', 'picked_up', 'on_the_way', 'arrived');`, [storeId]);
    console.log('Active orders query succeeded:', active.rows);
  } catch (e) {
    console.error('Active orders query failed:', e.message);
  }
  
  // 2. Test getStoreRecentOrders / getStoreOrders
  console.log('\n--- Testing orders queries ---');
  try {
    // Select *
    const resAll = await client.query(`SELECT * FROM public.orders WHERE store_id = $1;`, [storeId]);
    console.log('Select * query succeeded. Total rows:', resAll.rows.length);
  } catch (e) {
    console.error('Select * query failed:', e.message);
  }
  
  await client.query('ROLLBACK');
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
