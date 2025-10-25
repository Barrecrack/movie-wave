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
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SERVICE_ROLE_KEY;
console.log('🔍 Verificando variables de entorno...');
console.log(' - VITE_SUPABASE_URL:', supabaseUrl ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SUPABASE_ANON_KEY:', anonKey ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SERVICE_ROLE_KEY:', serviceKey ? '✅ OK' : '❌ NO DEFINIDA');
const supabaseAnon = (0, supabase_js_1.createClient)(supabaseUrl, anonKey);
const supabaseService = (0, supabase_js_1.createClient)(supabaseUrl, serviceKey);
const supabase = {
    auth: {
        async signUp(params) {
            try {
                return await supabaseService.auth.signUp(params);
            }
            catch {
                return await supabaseAnon.auth.signUp(params);
            }
        },
        async signInWithPassword(params) {
            try {
                return await supabaseService.auth.signInWithPassword(params);
            }
            catch {
                return await supabaseAnon.auth.signInWithPassword(params);
            }
        },
        async getUser(token) {
            try {
                return await supabaseService.auth.getUser(token);
            }
            catch {
                return await supabaseAnon.auth.getUser(token);
            }
        },
        async updateUser(data) {
            try {
                return await supabaseService.auth.updateUser(data);
            }
            catch {
                return await supabaseAnon.auth.updateUser(data);
            }
        },
        admin: {
            async listUsers() {
                return await supabaseService.auth.admin.listUsers();
            },
            async updateUserById(id, data) {
                return await supabaseService.auth.admin.updateUserById(id, data);
            }
        }
    },
    from: (table) => supabaseService.from(table),
};
exports.supabase = supabase;
console.log('✅ Cliente Supabase híbrido inicializado correctamente.');
