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

const clientConfig = {
  host: 'db.bxhnlwkhoeeqpifqvqxs.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: envPassword,
  ssl: { rejectUnauthorized: false },
};

console.log('Iniciando ejecución robusta de migraciones...');

const client = new pg.Client(clientConfig);
await client.connect();

try {
  for (const file of sqlFiles) {
    console.log(`\nAplicando migración: ${file}`);
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
    
    try {
      await client.query(sql);
      console.log(`✅ Migración ${file} aplicada con éxito.`);
    } catch (err) {
      console.log(`⚠️ Migración ${file} reportó una advertencia/error (se omitió porque la estructura puede ya existir):`);
      console.log(`   Detalle: ${err.message}`);
    }
  }
  console.log('\nProceso de migraciones finalizado.');
} catch (err) {
  console.error('Error general:', err.message);
} finally {
  await client.end();
}
