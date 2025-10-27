/**
 * @file supabaseClient.js
 * @description Initializes and configures the Supabase client using environment variables.
 * Provides authentication and database access through the service role key.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

console.log('🔹 Cargando variables de entorno...');
dotenv.config();

// 🔹 Environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SERVICE_ROLE_KEY!;

// 🔍 Configuration verification
console.log('🔍 Verificando variables de entorno...');
console.log(' - VITE_SUPABASE_URL:', supabaseUrl ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SERVICE_ROLE_KEY:', serviceKey ? '✅ OK' : '❌ NO DEFINIDA');

/**
 * Validates the presence of the required environment variables.
 * Throws an error if any are missing.
 * 
 * @throws {Error} If Supabase environment variables are missing.
 */
if (!supabaseUrl || !serviceKey) {
  throw new Error('❌ Faltan variables de entorno para conectar con Supabase.');
}

/**
 * @constant {SupabaseClient} supabaseService
 * @description Supabase service client with admin privileges.
 * This client is created using the Service Role Key, allowing full access to authentication and data.
 */
const supabaseService = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * @constant {Object} supabase
 * @description Wrapper object exposing authentication and database operations
 * using the Supabase service role client.
 */
const supabase = {
  auth: {
    /**
     * Registers a new user using email and password.
     * 
     * @async
     * @function signUp
     * @param {Object} params - Signup parameters (email, password, and optional data).
     * @returns {Promise<Object>} Supabase response with user and session data.
     */
    async signUp(params: any) {
      return await supabaseService.auth.signUp(params);
    },

    /**
     * Signs in a user using email and password credentials.
     * 
     * @async
     * @function signInWithPassword
     * @param {Object} params - Login parameters (email and password).
     * @returns {Promise<Object>} Supabase response with user and session.
     */
    async signInWithPassword(params: any) {
      return await supabaseService.auth.signInWithPassword(params);
    },

    /**
     * Retrieves user information using a valid access token.
     * 
     * @async
     * @function getUser
     * @param {string} token - Supabase access token.
     * @returns {Promise<Object>} User data.
     */
    async getUser(token: string) {
      return await supabaseService.auth.getUser(token);
    },

    /**
     * Updates the authenticated user's profile data.
     * 
     * @async
     * @function updateUser
     * @param {Object} data - Object containing fields to update.
     * @returns {Promise<Object>} Updated user information.
     */
    async updateUser(data: any) {
      return await supabaseService.auth.updateUser(data);
    },

    admin: {
      /**
       * Retrieves a list of all users (admin-level access).
       * 
       * @async
       * @function listUsers
       * @returns {Promise<Object>} List of users.
       */
      async listUsers() {
        return await supabaseService.auth.admin.listUsers();
      },

      /**
       * Updates a specific user's data by ID (admin-level access).
       * 
       * @async
       * @function updateUserById
       * @param {string} id - User ID.
       * @param {Object} data - Fields to update for the user.
       * @returns {Promise<Object>} Updated user record.
       */
      async updateUserById(id: string, data: any) {
        return await supabaseService.auth.admin.updateUserById(id, data);
      },
    },
  },

  /**
   * Provides direct access to a specific database table.
   * 
   * @function from
   * @param {string} table - Table name to query.
   * @returns {PostgrestQueryBuilder} Supabase query builder for the specified table.
   */
  from: (table: string) => supabaseService.from(table),
};

console.log('✅ Cliente Supabase (service role) inicializado correctamente.');

export { supabase };
