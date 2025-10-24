import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

console.log('🔹 Cargando variables de entorno...');
dotenv.config();

console.log('🔍 Verificando variables de entorno...');
console.log(' - VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ OK' : '❌ NO DEFINIDA');

// 🔎 Mostrar si SERVICE_ROLE_KEY existe y una vista parcial segura
if (process.env.SERVICE_ROLE_KEY) {
  const keyPreview = process.env.SERVICE_ROLE_KEY.slice(0, 8) + '...' + process.env.SERVICE_ROLE_KEY.slice(-4);
  console.log(` - SERVICE_ROLE_KEY: ✅ Cargada correctamente (${keyPreview})`);
} else {
  console.log(' - SERVICE_ROLE_KEY: ❌ NO DEFINIDA');
}

if (!process.env.VITE_SUPABASE_URL) {
  console.error('❌ Falta VITE_SUPABASE_URL en el archivo .env');
  throw new Error('❌ Faltante: VITE_SUPABASE_URL en .env');
}
if (!process.env.SUPABASE_ANON_KEY || !process.env.SERVICE_ROLE_KEY) {
  console.error('❌ Falta SUPABASE_ANON_KEY o SERVICE_ROLE_KEY en el archivo .env');
  throw new Error('❌ Faltante: SUPABASE_ANON_KEY o SERVICE_ROLE_KEY en .env');
}

// 🔹 Cliente normal (anon)
console.log('🚀 Inicializando cliente público de Supabase...');
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Cliente público inicializado correctamente.');

// 🔹 Cliente administrativo (service role)
console.log('🚀 Inicializando cliente administrativo de Supabase...');
const serviceRoleKey = process.env.SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
console.log('✅ Cliente administrativo inicializado correctamente.');
console.log('🧩 Tipo de clave usada: Service Role Key');

export { supabase, supabaseAdmin };
