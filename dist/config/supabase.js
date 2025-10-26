"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
console.log('🔹 Cargando variables de entorno...');
dotenv_1.default.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SERVICE_ROLE_KEY;
console.log('🔍 Verificando variables de entorno...');
console.log(' - VITE_SUPABASE_URL:', supabaseUrl ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SERVICE_ROLE_KEY:', serviceKey ? '✅ OK' : '❌ NO DEFINIDA');
if (!supabaseUrl || !serviceKey) {
    throw new Error('❌ Faltan variables de entorno para conectar con Supabase.');
}
const supabaseService = (0, supabase_js_1.createClient)(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
const supabase = {
    auth: {
        async signUp(params) {
            return await supabaseService.auth.signUp(params);
        },
        async signInWithPassword(params) {
            return await supabaseService.auth.signInWithPassword(params);
        },
        async getUser(token) {
            return await supabaseService.auth.getUser(token);
        },
        async updateUser(data) {
            return await supabaseService.auth.updateUser(data);
        },
        admin: {
            async listUsers() {
                return await supabaseService.auth.admin.listUsers();
            },
            async updateUserById(id, data) {
                return await supabaseService.auth.admin.updateUserById(id, data);
            },
        },
    },
    from: (table) => supabaseService.from(table),
};
exports.supabase = supabase;
console.log('✅ Cliente Supabase (service role) inicializado correctamente.');
