import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bxhnlwkhoeeqpifqvqxs.supabase.co';
const supabaseAnonKey = 'sb_publishable__YLr43cEbtmlrRPdhOmMsA_CeN6c2-n';

console.log('Iniciando prueba de conexión con Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

try {
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true }).limit(1);
  if (error) {
    console.error('Error de consulta:', error.message);
    if (error.message.includes('FetchError') || error.message.includes('fetch failed')) {
      console.log('Posible causa: El proyecto de Supabase está pausado o apagado.');
    }
  } else {
    console.log('¡Conexión exitosa! El proyecto está activo.');
    console.log('Número de perfiles:', data);
  }
} catch (e) {
  console.error('Error inesperado:', e.message);
}
