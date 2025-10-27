"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("./middlewares/cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const videosRoutes_1 = __importDefault(require("./routes/videosRoutes"));
const favoriteRoutes_1 = __importDefault(require("./routes/favoriteRoutes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(cors_1.default);
app.use(express_1.default.json());
app.get('/', (_, res) => {
    res.send('🚀 Servidor Express conectado a Supabase, Brevo API y Pexels listo.');
});
app.get('/debug', (_, res) => {
    res.json({
        environment: process.env.NODE_ENV,
        pexelsKey: process.env.PEXELS_API_KEY ? "✅ Configurada" : "❌ No configurada",
        port: process.env.PORT,
        frontendUrl: process.env.FRONTEND_URL,
        supabaseUrl: process.env.VITE_SUPABASE_URL ? "✅ Configurada" : "❌ No configurada",
        serviceRoleKey: process.env.SERVICE_ROLE_KEY ? "✅ Configurada" : "❌ No configurada"
    });
});
app.use('/api/favorites', favoriteRoutes_1.default);
app.use('/api', authRoutes_1.default);
app.use('/videos', videosRoutes_1.default);
app.listen(port, () => {
    console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
    console.log(`🔍 Ruta de debug disponible en: http://localhost:${port}/debug`);
    console.log(`🎬 Ruta de videos disponible en: http://localhost:${port}/videos/search`);
});
