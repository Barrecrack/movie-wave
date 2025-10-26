import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import corsMiddleware from './middlewares/cors';
import authRoutes from './routes/authRoutes';
import videosRoutes from './routes/videosRoutes'; // ✅ Importar la nueva ruta

// Configurar Express
const app = express();
const port = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());

// Ruta principal
app.get('/', (_: Request, res: Response) => {
  res.send('🚀 Servidor Express conectado a Supabase, Brevo API y Pexels listo.');
});

// ✅ Ruta de debugging
app.get('/debug', (_: Request, res: Response) => {
  res.json({
    environment: process.env.NODE_ENV,
    pexelsKey: process.env.PEXELS_API_KEY ? "✅ Configurada" : "❌ No configurada",
    port: process.env.PORT,
    frontendUrl: process.env.FRONTEND_URL,
    supabaseUrl: process.env.VITE_SUPABASE_URL ? "✅ Configurada" : "❌ No configurada",
    serviceRoleKey: process.env.SERVICE_ROLE_KEY ? "✅ Configurada" : "❌ No configurada"
  });
});

// ✅ Montar rutas
app.use('/api', authRoutes);
app.use('/videos', videosRoutes); // ✅ Ruta de videos agregada

// Iniciar servidor
app.listen(port, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
  console.log(`🔍 Ruta de debug disponible en: http://localhost:${port}/debug`);
  console.log(`🎬 Ruta de videos disponible en: http://localhost:${port}/videos/search`);
});