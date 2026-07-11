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
  const orderId = '4c4c3120-5b59-4dcc-acf9-e81e9d2d0f08'; // The order id we found
  const mockUser = '78b84612-ec77-4d5b-820f-1be2076d2e06'; // Chat Gpt (store owner)
  
  await client.query('BEGIN');
  await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [mockUser]);
  
  // Test select with joins
  console.log('Testing select order with joins...');
  try {
    const res = await client.query(`
      SELECT o.*, 
             COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') as order_items,
             COALESCE(json_agg(osh.*) FILTER (WHERE osh.id IS NOT NULL), '[]') as order_status_history,
             (SELECT json_build_object('full_name', p.full_name, 'avatar_url', p.avatar_url) FROM public.profiles p WHERE p.id = o.driver_id) as driver,
             (SELECT json_build_object('name', s.name, 'emoji', s.emoji) FROM public.stores s WHERE s.id = o.store_id) as store
      FROM public.orders o
      LEFT JOIN public.order_items oi ON oi.order_id = o.id
      LEFT JOIN public.order_status_history osh ON osh.order_id = o.id
      WHERE o.id = $1
      GROUP BY o.id;
    `, [orderId]);
    console.log('Select query succeeded!');
    console.log(res.rows[0]);
  } catch (e) {
    console.error('Select query failed:', e.message);
  }
  
  await client.query('ROLLBACK');
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
