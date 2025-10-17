import dotenv from "dotenv";
dotenv.config();  // Carga .env primero

import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';  // Importa aquí
import { sendRecoveryEmail } from "./email";

// Inicializa Supabase después de dotenv
const supabaseUrl = 'https://bkvcemcsijozbbbbtpnp.supabase.co';
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required. Please check your .env file or environment variables.');
}
const supabaseKey = process.env.SUPABASE_ANON_KEY;
console.log('✅ SUPABASE_ANON_KEY cargada correctamente.');  // Log de confirmación
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

// Ruta principal
app.get("/", (_: Request, res: Response) => {  // Agrega tipos: _: Request, res: Response
  res.send("🚀 Servidor Express conectado a Supabase listo con Brevo API.");
});

// Registro
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
  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Login
app.post("/api/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    res.json({ user: data.user });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// Recuperar contraseña
app.post("/api/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/#/reset_password`,
    });
    if (error) throw error;
    await sendRecoveryEmail(email, "token-placeholder");
    res.json({ message: "Correo de recuperación enviado" });
  } catch (error: any) {
    console.error("❌ Error en forgot-password:", error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(port, () => console.log(`🌐 Servidor escuchando en http://localhost:${port}`));