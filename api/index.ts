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

// ✅ Montar rutas
app.use('/api', authRoutes);
app.use('/videos', videosRoutes); // ✅ Ruta de videos agregada

// Iniciar servidor
app.listen(port, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
});
