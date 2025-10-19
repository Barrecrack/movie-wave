"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const supabase_js_1 = require("@supabase/supabase-js");
const email_1 = require("./email");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabaseUrl = 'https://bkvcemcsijozbbbbtpnp.supabase.co';
if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is required. Please check your .env file or environment variables.');
}
const supabaseKey = process.env.SUPABASE_ANON_KEY;
console.log('✅ SUPABASE_ANON_KEY cargada correctamente.');
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express_1.default.json());
app.get("/", (_, res) => {
    res.send("🚀 Servidor Express conectado a Supabase listo con Brevo API.");
});
app.post("/api/register", async (req, res) => {
    const { email, password, name, lastname } = req.body;
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, lastname },
            },
        });
        if (error)
            throw error;
        res.status(201).json({ user: data.user });
    }
    catch (error) {
        console.error("❌ Error en registro:", error);
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error)
            throw error;
        res.json({ user: data.user });
    }
    catch (error) {
        console.error("❌ Error en login:", error);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});
app.put("/api/update-user", async (req, res) => {
    const { name, lastname, email, password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: "Token requerido" });
    }
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: "Token inválido" });
        }
        const { data, error } = await supabase.auth.updateUser({
            email: email || user.email,
            password: password || undefined,
            data: {
                name: name || user.user_metadata?.name,
                lastname: lastname || user.user_metadata?.lastname,
            },
        });
        if (error)
            throw error;
        res.json({ user: data.user });
    }
    catch (error) {
        console.error("❌ Error en update-user:", error);
        res.status(500).json({ error: error.message });
    }
});
app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const resetToken = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        await (0, email_1.sendRecoveryEmail)(email, resetToken);
        res.json({ message: "Correo de recuperación enviado" });
    }
    catch (error) {
        console.error("❌ Error en forgot-password:", error);
        res.status(500).json({ error: error.message });
    }
});
app.post("/api/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        const email = decoded.email;
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({ error: "Access token requerido" });
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error)
            throw error;
        res.json({ message: "Contraseña actualizada" });
    }
    catch (error) {
        console.error("❌ Error en reset-password:", error);
        res.status(500).json({ error: error.message });
    }
});
app.listen(port, () => console.log(`🌐 Servidor escuchando en http://localhost:${port}`));
