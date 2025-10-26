import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

console.log('🔹 Cargando variables de entorno...');
dotenv.config();

// 🔹 Variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SERVICE_ROLE_KEY!;

// 🔍 Verificación de configuración
console.log('🔍 Verificando variables de entorno...');
console.log(' - VITE_SUPABASE_URL:', supabaseUrl ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SERVICE_ROLE_KEY:', serviceKey ? '✅ OK' : '❌ NO DEFINIDA');

// 🔸 Validar que existan las variables necesarias
if (!supabaseUrl || !serviceKey) {
  throw new Error('❌ Faltan variables de entorno para conectar con Supabase.');
}

// 🔹 Crear cliente con permisos de servicio (administrador)
const supabaseService = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 🔹 Cliente Supabase (solo role key)
const supabase = {
  auth: {
    async signUp(params: any) {
      return await supabaseService.auth.signUp(params);
    },
    async signInWithPassword(params: any) {
      return await supabaseService.auth.signInWithPassword(params);
    },
    async getUser(token: string) {
      return await supabaseService.auth.getUser(token);
    },
    async updateUser(data: any) {
      return await supabaseService.auth.updateUser(data);
    },
    admin: {
      async listUsers() {
        return await supabaseService.auth.admin.listUsers();
      },
      async updateUserById(id: string, data: any) {
        return await supabaseService.auth.admin.updateUserById(id, data);
      },
    },
  },

  // Acceso directo a las tablas
  from: (table: string) => supabaseService.from(table),
};

console.log('✅ Cliente Supabase (service role) inicializado correctamente.');

export { supabase };
