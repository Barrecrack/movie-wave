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
if (!process.env.VITE_SUPABASE_URL) {
    throw new Error("❌ Faltante: VITE_SUPABASE_URL en .env");
}
if (!process.env.SUPABASE_ANON_KEY && !process.env.SERVICE_ROLE_KEY) {
    throw new Error("❌ Faltante: SUPABASE_ANON_KEY o SERVICE_ROLE_KEY en .env");
}
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
console.log("✅ Supabase inicializado correctamente");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL.trim().replace(/\/$/, "")]
    : ["http://localhost:5173"];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(cleanOrigin)) {
            callback(null, true);
        }
        else {
            console.warn(`🚫 CORS bloqueado para origen no permitido: ${origin}`);
            callback(new Error("No autorizado por CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
};
app.use((0, cors_1.default)(corsOptions));
app.options("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.get("/", (_, res) => {
    res.send("🚀 Servidor Express conectado a Supabase y listo con Brevo API.");
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
        console.error("❌ Error en registro:", error.message);
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
        res.json({ user: data.user, token: data.session?.access_token });
    }
    catch (error) {
        console.error("❌ Error en login:", error.message);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});
app.put("/api/update-user", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Token requerido" });
    }
    try {
        let { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            console.warn("⚠️ Token posiblemente expirado, intentando refrescar sesión...");
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshed?.user) {
                return res.status(401).json({ error: "Token inválido o sesión expirada" });
            }
            user = refreshed.user;
        }
        const { name, lastname, email, password } = req.body;
        if (!process.env.SERVICE_ROLE_KEY) {
            console.warn("⚠️ SERVICE_ROLE_KEY no definida, usando auth.updateUser()");
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
            return res.json({ user: data.user });
        }
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            email,
            password: password || undefined,
            user_metadata: { name, lastname },
        });
        if (updateError)
            throw updateError;
        res.json({ message: "Perfil actualizado correctamente" });
    }
    catch (error) {
        console.error("❌ Error en update-user:", error.message);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
});
app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const resetToken = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET || "secret", { expiresIn: "1h" });
        await (0, email_1.sendRecoveryEmail)(email, resetToken);
        res.json({ message: "Correo de recuperación enviado" });
    }
    catch (error) {
        console.error("❌ Error en forgot-password:", error.message);
        res.status(500).json({ error: error.message });
    }
});
app.post("/api/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        const email = decoded.email;
        const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
        if (searchError)
            throw searchError;
        const user = users.find((u) => u.email === email);
        if (!user)
            return res.status(404).json({ error: "Usuario no encontrado" });
        const { error } = await supabase.auth.admin.updateUserById(user.id, {
            password: newPassword,
        });
        if (error)
            throw error;
        res.json({ message: "Contraseña actualizada correctamente" });
    }
    catch (error) {
        console.error("❌ Error en reset-password:", error.message);
        res.status(500).json({ error: error.message });
    }
});
app.listen(port, () => {
    console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
});
