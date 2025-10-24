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
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(cors_1.default);
app.use(express_1.default.json());
app.get('/', (_, res) => {
    res.send('🚀 Servidor Express conectado a Supabase y listo con Brevo API.');
});
app.use('/api', authRoutes_1.default);
app.listen(port, () => {
    console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
});
