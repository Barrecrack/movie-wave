import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

console.log('🔹 Cargando variables de entorno...');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;
const serviceKey = process.env.SERVICE_ROLE_KEY!;

console.log('🔍 Verificando variables de entorno...');
console.log(' - VITE_SUPABASE_URL:', supabaseUrl ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SUPABASE_ANON_KEY:', anonKey ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SERVICE_ROLE_KEY:', serviceKey ? '✅ OK' : '❌ NO DEFINIDA');

// 🔹 Clientes base
const supabaseAnon = createClient(supabaseUrl, anonKey);
const supabaseService = createClient(supabaseUrl, serviceKey);

// 🔹 Cliente híbrido inteligente
const supabase = {
  auth: {
    // Intenta con la clave de servicio, si falla usa la anon
    async signUp(params: any) {
      try {
        return await supabaseService.auth.signUp(params);
      } catch {
        return await supabaseAnon.auth.signUp(params);
      }
    },
    async signInWithPassword(params: any) {
      try {
        return await supabaseService.auth.signInWithPassword(params);
      } catch {
        return await supabaseAnon.auth.signInWithPassword(params);
      }
    },
    async getUser(token: string) {
      try {
        return await supabaseService.auth.getUser(token);
      } catch {
        return await supabaseAnon.auth.getUser(token);
      }
    },
    async updateUser(data: any) {
      try {
        return await supabaseService.auth.updateUser(data);
      } catch {
        return await supabaseAnon.auth.updateUser(data);
      }
    },
    admin: {
      async listUsers() {
        return await supabaseService.auth.admin.listUsers();
      },
      async updateUserById(id: string, data: any) {
        return await supabaseService.auth.admin.updateUserById(id, data);
      }
    }
  },
  from: (table: string) => supabaseService.from(table), // acceso completo a BD
};

console.log('✅ Cliente Supabase híbrido inicializado correctamente.');

export { supabase };
