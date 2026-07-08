import { readFileSync } from 'fs';
import pg from 'pg';

const sql = readFileSync('supabase/migracion_completa.sql', 'utf8');

async function tryConnect(host, port, user) {
  return new Promise((resolve) => {
    const pool = new pg.Pool({
      host, port, database: 'postgres',
      user, password: 'DoCJGWR68RBjUzE6',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    pool.query('SELECT 1 AS ok').then((r) => {
      console.log('Conectado a:', host, port, user);
      pool.end(); resolve(pool);
    }).catch(() => {
      pool.end().catch(() => {}); resolve(null);
    });
  });
}

const attempts = [
  { host: 'aws-0-sa-east-1.pooler.supabase.com', port: 6543, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'aws-0-eu-west-1.pooler.supabase.com', port: 6543, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'db.bxhnlwkhoeeqpifqvqxs.supabase.co', port: 5432, user: 'postgres' },
  { host: 'bxhnlwkhoeeqpifqvqxs.supabase.co', port: 5432, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'bxhnlwkhoeeqpifqvqxs.pooler.supabase.com', port: 6543, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'bxhnlwkhoeeqpifqvqxs.pooler.supabase.com', port: 5432, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
];

for (const a of attempts) {
  const pool = await tryConnect(a.host, a.port, a.user);
  if (pool) {
    try {
      await pool.query(sql);
      console.log('Migraciones ejecutadas correctamente.');
    } catch (err) {
      console.error('Error ejecutando migraciones:', err.message);
      process.exit(1);
    } finally {
      await pool.end();
    }
    process.exit(0);
  }
}

console.error('No se pudo conectar a la base de datos.');
process.exit(1);
