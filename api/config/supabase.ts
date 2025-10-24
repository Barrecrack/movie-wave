import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validación de variables
if (!process.env.VITE_SUPABASE_URL) {
  throw new Error('❌ Faltante: VITE_SUPABASE_URL en .env');
}
if (!process.env.SUPABASE_ANON_KEY && !process.env.SERVICE_ROLE_KEY) {
  throw new Error('❌ Faltante: SUPABASE_ANON_KEY o SERVICE_ROLE_KEY en .env');
}

// Inicializar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase inicializado correctamente');

export { supabase };