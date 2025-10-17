import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || 'https://db.bkvcemcsijozbbbbtpnp.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'MovieWave750018@';
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para verificar la conexión a Supabase
async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);  // Intenta seleccionar un registro de prueba
    if (error) {
      console.error('Error de conexión a Supabase:', error.message);
      return false;
    }
    console.log('Conexión a Supabase exitosa. Datos recuperados:', data);
    return true;
  } catch (error: unknown) {
    console.error('Error al verificar la conexión a Supabase:', error instanceof Error ? error.message : 'Desconocido');
    return false;
  }
}
// Llama a la verificación al inicio
checkSupabaseConnection().then((success) => {
  if (success) {
    console.log('Iniciando el servidor después de verificar la conexión a Supabase.');
  } else {
    console.log('Advertencia: No se pudo verificar la conexión a Supabase, pero el servidor se iniciará de todos modos.');
  }
});

// RUTA DE REGISTRO
app.post('/api/register', async (req: Request, res: Response) => {
  const { email, password, name, lastname } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, lastname } }
    });
    if (error) throw error;  // Lanza el error para el catch
    res.status(201).json({ message: 'Usuario registrado', user: data.user });
  } catch (error: unknown) {  // Especifica unknown explícitamente
    let errorMessage = 'Error desconocido';
    if (error instanceof Error) {  // Type guard
      errorMessage = error.message;
    }
    res.status(500).json({ error: errorMessage });
  }
});

// RUTA DE LOGIN
app.post('/api/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ token: data.session?.access_token });
  } catch (error: unknown) {
    let errorMessage = 'Error desconocido';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(401).json({ error: errorMessage });
  }
});

// RUTA DE RECUPERACIÓN DE CONTRASEÑA
app.post('/api/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });
    if (error) throw error;
    res.json({ message: 'Correo de recuperación enviado' });
  } catch (error: unknown) {
    let errorMessage = 'Error desconocido';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({ error: errorMessage });
  }
});

// Otras rutas o middleware...

app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});
