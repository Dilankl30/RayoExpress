import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

let envPassword = process.env.SUPABASE_DB_PASSWORD;
if (!envPassword && existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf8');
  const match = envContent.match(/^SUPABASE_DB_PASSWORD\s*=\s*["']?([^"'\s#]+)["']?/m);
  if (match) {
    envPassword = match[1];
  }
}

// Read supabase details from src/integrations/supabase/client.ts or .env
const supabaseUrl = 'https://db.bxhnlwkhoeeqpifqvqxs.supabase.co'; // database URL is different from api URL!
// Wait, the API URL is bxhnlwkhoeeqpifqvqxs.supabase.co!
const supabaseApiUrl = 'https://bxhnlwkhoeeqpifqvqxs.supabase.co';
// We need the service role key or anon key to authenticate
// Let's search for SUPABASE_ANON_KEY in .env
let anonKey = '';
if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf8');
  const match = envContent.match(/^VITE_SUPABASE_ANON_KEY\s*=\s*["']?([^"'\s#]+)["']?/m);
  if (match) {
    anonKey = match[1];
  }
}

const supabase = createClient(supabaseApiUrl, anonKey);

try {
  // Let's sign in as the store owner
  // In the database: 78b84612-ec77-4d5b-820f-1be2076d2e06 is the store owner user ID.
  // Wait, can we sign in using a service token, or simulate the auth header?
  // We can just construct a client with the user's JWT or use the service role key.
  // Wait, let's see if we have the service role key to query.
  // Actually, we can run a postgres test as user 78b84612-ec77-4d5b-820f-1be2076d2e06 to see if the select from orders table has any error!
  // Wait, we did that in test-store-dashboard-stats.mjs and it threw:
  // "Rating query failed: column 'rating' does not exist"
  // Oh!!!
  // In test-store-dashboard-stats.mjs:
  // The query "SELECT rating FROM public.stores" failed because the column "rating" does not exist!
  // And since getStoreDashboardStats executes:
  // const [salesRes, activeRes, productsRes, ratingRes] = await Promise.all([ ... ]);
  // and ratingRes fails, what happens in JavaScript?
  // In JavaScript, ratingRes has a database error: ratingRes.error = { message: "column rating does not exist", ... }.
  // Wait! In store-analytics.service.ts line 67:
  // const ratings = (ratingRes.data as { rating: number }[] || []).map((d) => d.rating).filter(Boolean);
  // Wait! If ratingRes has an error, ratingRes.data is null!
  // So ratingRes.data as ... || [] evaluates to [].
  // So it doesn't crash here.
  // BUT wait! Does ratingRes.error get thrown?
  // No!
  // BUT wait, is there an error in productsRes or activeRes?
  // Let's check: does getStoreDashboardStats throw an error?
  // Wait, in store-analytics.service.ts line 63:
  // if (salesRes.error) throw salesRes.error;
  // What about activeRes.error?
  // If activeRes.error is present, it does NOT throw it, but activeRes.count will be null, so activeOrders will be 0.
  // So that does not throw.
  // But wait! What about getStoreRecentOrders?
  // In StoreDashboard.tsx, is activeTab === 'dashboard' rendering getStoreRecentOrders?
  // Wait, StoreDashboard.tsx does not call getStoreRecentOrders! It only calls loadOrders which calls getStoreOrders!
  // Wait, let's look at getStoreOrders query:
  // SELECT * FROM public.orders WHERE store_id = $1;
  // Does it succeed?
  // In test-store-dashboard-stats.mjs, the transaction was aborted because of the rating error.
  // Let's run a separate query test without rating query to see if SELECT * FROM public.orders succeeds!
  console.log('Testing SELECT * from orders directly...');
} catch (e) {
  console.error(e);
}
