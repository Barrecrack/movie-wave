import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import { createClient } from "@supabase/supabase-js";
import { sendRecoveryEmail } from "./email";
import jwt from "jsonwebtoken";

// ---------------------------
// 🔹 Validation of variables
// ---------------------------
if (!process.env.VITE_SUPABASE_URL) {
  throw new Error("❌ Faltante: VITE_SUPABASE_URL en .env");
}
if (!process.env.SUPABASE_ANON_KEY && !process.env.SERVICE_ROLE_KEY) {
  throw new Error("❌ Faltante: SUPABASE_ANON_KEY o SERVICE_ROLE_KEY en .env");
}

// ---------------------------
// 🔹 Initialize Supabase
// ---------------------------
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("✅ Supabase inicializado correctamente");

// ---------------------------
// 🔹 Configure Express Server
// ---------------------------
const app = express();
const port = process.env.PORT || 3000;

// ---------------------------
// 🔹 Dynamic CORS
// ---------------------------
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL.trim().replace(/\/$/, "")]
  : ["http://localhost:5173"];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allows Postman or SSR without origin
    const cleanOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS bloqueado para origen no permitido: ${origin}`);
      callback(new Error("No autorizado por CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204, // avoid errors in older browsers
};

app.use(cors(corsOptions));
// Global preflight (for OPTIONS)
app.options("*", cors(corsOptions));

app.use(express.json());

// ---------------------------
// 🔹 Main route
// ---------------------------
app.get("/", (_: Request, res: Response) => {
  res.send("🚀 Servidor Express conectado a Supabase y listo con Brevo API.");
});

// ---------------------------
// 🔹 User registration
// ---------------------------
app.post("/api/register", async (req: Request, res: Response) => {
  const { email, password, name, lastname } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, lastname },
      },
    });
    if (error) throw error;
    res.status(201).json({ user: data.user });
  } catch (error: any) {
    console.error("❌ Error en registro:", error.message);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// ---------------------------
// 🔹 User login
// ---------------------------
app.post("/api/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    res.json({ user: data.user, token: data.session?.access_token });
  } catch (error: any) {
    console.error("❌ Error en login:", error.message);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// ---------------------------
// 🔹 Edit user profile
// ---------------------------
app.put("/api/update-user", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    // Trying to get the user
    let { data: { user }, error: userError } = await supabase.auth.getUser(token);

    // If it fails, try to refresh session before invalidating
    if (userError || !user) {
      console.warn("⚠️ Token posiblemente expirado, intentando refrescar sesión...");
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed?.user) {
        return res.status(401).json({ error: "Token inválido o sesión expirada" });
      }
      user = refreshed.user;
    }

    const { name, lastname, email, password } = req.body;

    // If there is no SERVICE_ROLE_KEY, use auth.updateUser
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
      if (error) throw error;
      return res.json({ user: data.user });
    }

    // If SERVICE_ROLE_KEY is present, use admin privileges
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email,
        password: password || undefined,
        user_metadata: { name, lastname },
      }
    );

    if (updateError) throw updateError;

    res.json({ message: "Perfil actualizado correctamente" });
  } catch (error: any) {
    console.error("❌ Error en update-user:", error.message);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// ---------------------------
// 🔹 Password recovery
// ---------------------------
app.post("/api/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const resetToken = jwt.sign(
      { email },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1h" }
    );

    await sendRecoveryEmail(email, resetToken);
    res.json({ message: "Correo de recuperación enviado" });
  } catch (error: any) {
    console.error("❌ Error en forgot-password:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------
// 🔹 Reset password
// ---------------------------
app.post("/api/reset-password", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const email = decoded.email;

    const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
    if (searchError) throw searchError;

    const user = users.find((u) => u.email === email);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (error) throw error;

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error: any) {
    console.error("❌ Error en reset-password:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------
// 🔹 Start server
// ---------------------------
app.listen(port, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
});
