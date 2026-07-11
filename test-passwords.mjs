import pg from 'pg';

const host = 'aws-0-us-west-2.pooler.supabase.com';
const port = 6543;
const user = 'postgres.bxhnlwkhoeeqpifqvqxs';

const passwords = [
  'DoCJGWR68RBjUzE6',
  'supabase',
  'supabase DoCJGWR68RBjUzE6',
  'supabaseDoCJGWR68RBjUzE6'
];

console.log('Probando diferentes combinaciones de contraseña...');

for (const pwd of passwords) {
  console.log(`Intentando con contraseña: "${pwd}"`);
  const pool = new pg.Pool({
    host,
    port,
    database: 'postgres',
    user,
    password: pwd,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    const res = await pool.query('SELECT 1;');
    console.log(`\n🎉 ¡CONEXIÓN EXITOSA! La contraseña correcta es: "${pwd}"`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    if (err.message.includes('tenant/user') && err.message.includes('not found')) {
      console.log(`❌ Falló con error: tenant/user not found (puede ser por contraseña incorrecta)`);
    } else {
      console.log(`⚠️ Otro error: ${err.message}`);
    }
  }
  await pool.end();
}

console.log('\n❌ Ninguna de las contraseñas provistas funcionó.');
