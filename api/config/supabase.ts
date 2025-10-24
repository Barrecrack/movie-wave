import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

console.log('🔹 Cargando variables de entorno...');
dotenv.config();

console.log('🔍 Verificando variables de entorno...');
console.log(' - VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ OK' : '❌ NO DEFINIDA');

// Mostrar parcialmente la clave de servicio para confirmar que es la correcta
if (process.env.SERVICE_ROLE_KEY) {
  const keyPreview = process.env.SERVICE_ROLE_KEY.slice(0, 10) + '...' + process.env.SERVICE_ROLE_KEY.slice(-6);
  console.log(` - SERVICE_ROLE_KEY: ✅ Cargada correctamente (${keyPreview})`);
} else {
  console.log(' - SERVICE_ROLE_KEY: ❌ NO DEFINIDA');
}

// Verificación estricta de entorno
if (!process.env.VITE_SUPABASE_URL) {
  console.error('❌ Falta VITE_SUPABASE_URL en el archivo .env');
  throw new Error('❌ Faltante: VITE_SUPABASE_URL en .env');
}
if (!process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Falta SUPABASE_ANON_KEY en el archivo .env');
  throw new Error('❌ Faltante: SUPABASE_ANON_KEY en .env');
}
if (!process.env.SERVICE_ROLE_KEY) {
  console.error('❌ Falta SERVICE_ROLE_KEY en el archivo .env');
  throw new Error('❌ Faltante: SERVICE_ROLE_KEY en .env');
}

// ----------------------
// 🔹 Inicialización
// ----------------------
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY!;

// Cliente público (usuario final)
console.log('🚀 Inicializando cliente público (anon) de Supabase...');
const supabase = createClient(supabaseUrl, anonKey);
console.log('✅ Cliente público inicializado correctamente.');

// Cliente administrativo (clave de servicio)
console.log('🚀 Inicializando cliente administrativo (service role) de Supabase...');
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
console.log('✅ Cliente administrativo inicializado correctamente.');
console.log('🧩 Tipo de clave usada para supabaseAdmin: Service Role Key');

// ----------------------
// 🧠 Verificación activa
// ----------------------
(async () => {
  try {
    console.log('🔎 Verificando acceso administrativo con supabaseAdmin...');
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.error('❌ El cliente administrativo no tiene permisos (probablemente se esté usando la Anon Key).');
      console.error('📛 Mensaje de Supabase:', error.message);
    } else {
      console.log(`✅ Acceso administrativo confirmado. Usuarios cargados: ${data.users.length}`);
    }
  } catch (err: any) {
    console.error('❌ Error al probar el cliente admin:', err.message);
  }
})();

export { supabase, supabaseAdmin };
