import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import corsMiddleware from './middlewares/cors';
import authRoutes from './routes/authRoutes';

// Configurar Express
const app = express();
const port = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());

// Ruta principal
app.get('/', (_: Request, res: Response) => {
  res.send('🚀 Servidor Express conectado a Supabase y listo con Brevo API.');
});

// Montar rutas
app.use('/api', authRoutes);

// Iniciar servidor
app.listen(port, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
});