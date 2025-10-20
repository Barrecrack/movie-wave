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
console.log("🧩 Iniciando servidor con variables de entorno...");
if (!process.env.VITE_SUPABASE_URL) {
  throw new Error("❌ Faltante: VITE_SUPABASE_URL en .env");
}
if (!process.env.SUPABASE_ANON_KEY && !process.env.SERVICE_ROLE_KEY) {
  throw new Error("❌ Faltante: SUPABASE_ANON_KEY o SERVICE_ROLE_KEY en .env");
}
console.log("✅ Variables de entorno cargadas correctamente");

// ---------------------------
// 🔹 Initialize Supabase
// ---------------------------
console.log("🔗 Conectando a Supabase...");
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("✅ Supabase inicializado correctamente");

// ---------------------------
// 🔹 Configure Express Server
// ---------------------------
const app = express();
const port = process.env.PORT || 3000;
console.log("⚙️ Inicializando servidor Express...");

// ---------------------------
// 🔹 Dynamic CORS
// ---------------------------
console.log("🌐 Configurando CORS...");
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL.trim().replace(/\/$/, "")]
  : ["http://localhost:5173"];

console.log("🔹 Orígenes permitidos:", allowedOrigins);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      console.log("ℹ️ Petición sin origin (probablemente Postman o SSR)");
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(cleanOrigin)) {
      console.log(`✅ CORS permitido: ${cleanOrigin}`);
      callback(null, true);
    } else {
      console.warn(`🚫 CORS bloqueado para origen no permitido: ${origin}`);
      callback(new Error("No autorizado por CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// ---------------------------
// 🔹 Main route
// ---------------------------
app.get("/", (_: Request, res: Response) => {
  console.log("📡 Petición GET / recibida");
  res.send("🚀 Servidor Express conectado a Supabase y listo con Brevo API.");
});

// ---------------------------
// 🔹 User registration
// ---------------------------
app.post("/api/register", async (req: Request, res: Response) => {
  const { email, password, name, lastname } = req.body;
  console.log("📝 Registro solicitado:", { email, name, lastname });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, lastname } },
    });

    if (error) {
      console.error("❌ Supabase signUp error:", error.message);
      throw error;
    }

    console.log("✅ Usuario registrado correctamente:", data.user?.id);
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
  console.log("🔐 Intento de login:", email);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Supabase login error:", error.message);
      throw error;
    }

    console.log("✅ Login exitoso:", data.user?.id);
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
  console.log("🛠️ Petición PUT /api/update-user recibida");
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.warn("⚠️ Petición sin token en encabezado Authorization");
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    console.log("🔎 Verificando token en Supabase...");
    let { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.warn("⚠️ Token posiblemente expirado:", userError?.message);
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed?.user) {
        console.error("❌ No se pudo refrescar sesión:", refreshError?.message);
        return res.status(401).json({ error: "Token inválido o sesión expirada" });
      }
      user = refreshed.user;
      console.log("✅ Sesión refrescada exitosamente");
    }

    const { name, lastname, email, password } = req.body;
    console.log("✏️ Datos recibidos para actualización:", { name, lastname, email });

    if (!process.env.SERVICE_ROLE_KEY) {
      console.log("🟡 Modo limitado: usando auth.updateUser()");
      const { data, error } = await supabase.auth.updateUser({
        email: email || user.email,
        password: password || undefined,
        data: {
          name: name || user.user_metadata?.name,
          lastname: lastname || user.user_metadata?.lastname,
        },
      });
      if (error) throw error;
      console.log("✅ Usuario actualizado con updateUser()");
      return res.json({ user: data.user });
    }

    console.log("🧷 Modo admin: actualizando con SERVICE_ROLE_KEY");
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email,
        password: password || undefined,
        user_metadata: { name, lastname },
      }
    );

    if (updateError) throw updateError;

    console.log("✅ Usuario actualizado correctamente en admin.updateUserById");
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
  console.log("📧 Solicitud de recuperación de contraseña para:", email);

  try {
    const resetToken = jwt.sign(
      { email },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1h" }
    );

    console.log("🔑 Token de recuperación generado:", resetToken.slice(0, 15) + "...");
    await sendRecoveryEmail(email, resetToken);
    console.log("✅ Correo de recuperación enviado con éxito");
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
  console.log("🔁 Petición POST /api/reset-password recibida");
  const { token, newPassword } = req.body;
  console.log("📨 Token recibido:", token ? token.slice(0, 20) + "..." : "No token");

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const email = decoded.email;
    console.log("✅ Token verificado, email:", email);

    const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
    if (searchError) throw searchError;

    console.log("👥 Usuarios obtenidos de Supabase:", users?.length);
    const user = users.find((u) => u.email === email);
    if (!user) {
      console.warn("⚠️ Usuario no encontrado para:", email);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log("🔧 Actualizando contraseña para usuario:", user.id);
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (error) throw error;

    console.log("✅ Contraseña actualizada correctamente");
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
