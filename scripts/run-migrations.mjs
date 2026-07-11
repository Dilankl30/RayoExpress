import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import pg from 'pg';

// Intentar cargar variables de entorno desde el archivo local .env si existe
let envPassword = process.env.SUPABASE_DB_PASSWORD;
if (!envPassword && existsSync('.env')) {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const match = envContent.match(/^SUPABASE_DB_PASSWORD\s*=\s*["']?([^"'\s#]+)["']?/m);
    if (match) {
      envPassword = match[1];
    }
  } catch (e) {
    console.error('Error leyendo archivo .env:', e.message);
  }
}

// Obtener todas las migraciones en orden
const migrationsDir = 'supabase/migrations';
let sqlFiles = [];
try {
  sqlFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
} catch (err) {
  console.error('Error leyendo directorio de migraciones:', err.message);
  process.exit(1);
}

async function tryConnect(host, port, user) {
  return new Promise((resolve) => {
    const pool = new pg.Pool({
      host, port, database: 'postgres',
      user, password: envPassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    pool.query('SELECT 1 AS ok').then((r) => {
      console.log('Conectado a:', host, port, user);
      pool.end(); resolve(pool);
    }).catch((err) => {
      console.error(`Error conectando a ${host}:${port} (${user}):`, err.message);
      pool.end().catch(() => {}); resolve(null);
    });
  });
}

const attempts = [
  { host: 'db.bxhnlwkhoeeqpifqvqxs.supabase.co', port: 5432, user: 'postgres' },
  { host: 'aws-0-us-west-2.pooler.supabase.com', port: 6543, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'aws-0-us-west-2.pooler.supabase.com', port: 5432, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'aws-0-sa-east-1.pooler.supabase.com', port: 6543, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
  { host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, user: 'postgres.bxhnlwkhoeeqpifqvqxs' },
];

let connectedPoolConfig = null;
for (const a of attempts) {
  const pool = await tryConnect(a.host, a.port, a.user);
  if (pool) {
    connectedPoolConfig = a;
    break;
  }
}

if (!connectedPoolConfig) {
  console.error('No se pudo conectar a la base de datos.');
  process.exit(1);
}

// Ejecutar cada migración en orden secuencial
const pool = new pg.Pool({
  ...connectedPoolConfig,
  database: 'postgres',
  password: envPassword,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log(`Ejecutando ${sqlFiles.length} archivos de migración...`);
  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    console.log(`Aplicando migración: ${file}`);
    const sql = readFileSync(filePath, 'utf8');
    await pool.query(sql);
  }
  console.log('Todas las migraciones se ejecutaron correctamente.');
} catch (err) {
  console.error('Error ejecutando migraciones:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
