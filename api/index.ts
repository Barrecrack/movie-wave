import dotenv from "dotenv";
dotenv.config();  // Carga .env primero

import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';  // Importa aquí
import { sendRecoveryEmail } from "./email";
import jwt from 'jsonwebtoken';

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

//Edit User
app.put("/api/update-user", async (req: Request, res: Response) => {
  const { name, lastname, email, password } = req.body;
  const token = req.headers.authorization?.split(' ')[1]; // Asume Bearer token
  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }
  try {
    // Verifica el token con Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: "Token inválido" });
    }
    // Actualiza usuario en Supabase
    const { data, error } = await supabase.auth.updateUser({
      email: email || user.email,
      password: password || undefined, // Solo si se proporciona
      data: {
        name: name || user.user_metadata?.name,
        lastname: lastname || user.user_metadata?.lastname,
      },
    });
    if (error) throw error;
    res.json({ user: data.user });
  } catch (error: any) {
    console.error("❌ Error en update-user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Recuperar contraseña
app.post("/api/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    // Genera un token JWT simple para el reset (expira en 1 hora)
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    // Envía solo el email personalizado con Brevo
    await sendRecoveryEmail(email, resetToken);
    res.json({ message: "Correo de recuperación enviado" });
  } catch (error: any) {
    console.error("❌ Error en forgot-password:", error);
    res.status(500).json({ error: error.message });
  }
});

// NUEVO: Endpoint para resetear contraseña con token
app.post("/api/reset-password", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  try {
    // Verifica el token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const email = decoded.email;
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: "Access token requerido" });
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    res.json({ message: "Contraseña actualizada" });
  } catch (error: any) {
    console.error("❌ Error en reset-password:", error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(port, () => console.log(`🌐 Servidor escuchando en http://localhost:${port}`));