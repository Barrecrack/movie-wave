"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
console.log('🔹 Configurando CORS...');
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL.trim().replace(/\/$/, '')]
    : ['http://localhost:5173'];
console.log('✅ Orígenes permitidos:', allowedOrigins);
const corsOptions = {
    origin: (origin, callback) => {
        console.log('🌍 Solicitud CORS desde origen:', origin || '(sin origen)');
        if (!origin) {
            console.log('🟢 Solicitud sin origen (permitida).');
            return callback(null, true);
        }
        const cleanOrigin = origin.replace(/\/$/, '');
        if (allowedOrigins.includes(cleanOrigin)) {
            console.log(`🟢 CORS permitido para: ${cleanOrigin}`);
            callback(null, true);
        }
        else {
            console.warn(`🚫 CORS bloqueado para origen no permitido: ${origin}`);
            callback(new Error('No autorizado por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
};
console.log('✅ Middleware CORS configurado correctamente.');
exports.default = (0, cors_1.default)(corsOptions);
