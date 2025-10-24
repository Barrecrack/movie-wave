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
console.log('🔍 Verificando variables de entorno...');
console.log(' - VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ OK' : '❌ NO DEFINIDA');
console.log(' - SERVICE_ROLE_KEY:', process.env.SERVICE_ROLE_KEY ? '✅ OK' : '❌ NO DEFINIDA');
if (!process.env.VITE_SUPABASE_URL) {
    console.error('❌ Error: Falta VITE_SUPABASE_URL en el archivo .env');
    throw new Error('❌ Faltante: VITE_SUPABASE_URL en .env');
}
if (!process.env.SUPABASE_ANON_KEY && !process.env.SERVICE_ROLE_KEY) {
    console.error('❌ Error: Faltante SUPABASE_ANON_KEY o SERVICE_ROLE_KEY en el archivo .env');
    throw new Error('❌ Faltante: SUPABASE_ANON_KEY o SERVICE_ROLE_KEY en .env');
}
console.log('🚀 Inicializando cliente de Supabase...');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
exports.supabase = supabase;
console.log('✅ Supabase inicializado correctamente');
console.log('🌍 URL de conexión:', supabaseUrl);
console.log('🔑 Tipo de clave usada: Anon Key');
