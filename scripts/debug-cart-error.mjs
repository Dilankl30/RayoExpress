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
  // Let's find customer records using c.id instead of user_id
  const custRes = await client.query(`
    SELECT c.id as customer_id, p.role, p.full_name
    FROM public.customers c
    JOIN public.profiles p ON p.id = c.id;
  `);
  console.log('Customers found:');
  console.log(custRes.rows);

  // Let's find the store owner of Cardenas
  const storeRes = await client.query(`
    SELECT id, name, owner_id, is_open FROM public.stores;
  `);
  console.log('Stores found:');
  console.log(storeRes.rows);

  // Let's find the product "poiaz"
  const prodRes = await client.query(`
    SELECT id, name, price, store_id, is_active FROM public.products WHERE name ILIKE '%poiaz%';
  `);
  console.log('Product poiaz found:');
  console.log(prodRes.rows);

  // Let's mock a create_order call inside a transaction and rollback, using one of the customer's customer_id (which is their profile/user ID)
  if (custRes.rows.length > 0) {
    const mockUser = custRes.rows[0].customer_id;
    console.log(`\nMocking create_order call as user: ${mockUser} (${custRes.rows[0].full_name})`);
    
    await client.query('BEGIN');
    
    // Set current user ID setting so auth.uid() returns the mock user
    await client.query(`
      SELECT set_config('request.jwt.claim.sub', $1, true);
    `, [mockUser]);
    
    try {
      const storeId = '868e31eb-f6ad-4a04-9d06-18474a7f1af5'; // Tienda Cardenas
      const productIds = [prodRes.rows[0].id];
      const quantities = [3];
      const deliveryAddress = 'Coca (-0.440161, -76.998304), GPS del dispositivo';
      
      const rpcCall = await client.query(`
        SELECT public.create_order($1, $2, $3, $4, 'cash', null, null, 0, -0.440161, -76.998304);
      `, [storeId, productIds, quantities, deliveryAddress]);
      
      console.log('RPC execution succeeded:', rpcCall.rows[0]);
    } catch (rpcErr) {
      console.error('RPC failed with error:');
      console.error(rpcErr.message);
      console.error(rpcErr.detail);
      console.error(rpcErr.hint);
    } finally {
      await client.query('ROLLBACK');
    }
  }
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
