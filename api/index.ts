import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import corsMiddleware from './middlewares/cors';
import authRoutes from './routes/authRoutes';
import videosRoutes from './routes/videosRoutes'; 
import favoriteRoutes from './routes/favoriteRoutes';
import ratingRoutes from './routes/ratingRoutes';

/**
 * @fileoverview Entry point for the Express server configuration.
 * Loads environment variables, initializes middleware, and mounts routes for authentication, videos, and favorites.
 */

/**
 * @constant app
 * @description Express application instance.
 */
const app = express();

/**
 * @constant port
 * @description Server port number from environment variables or default (3000).
 */
const port = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());

/**
 * @route GET /
 * @description Root route to confirm the server is running and connected to Supabase, Brevo API, and Pexels.
 * @returns {string} Confirmation message.
 */
app.get('/', (_: Request, res: Response) => {
  res.send('🚀 Servidor Express conectado a Supabase, Brevo API y Pexels listo.');
});

/**
 * @route GET /debug
 * @description Debug route to check environment configuration and API keys.
 * @returns {object} JSON with configuration status.
 */
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

/**
 * @route /api/favorites
 * @description Routes related to user's favorite content management.
 */
app.use('/api/favorites', favoriteRoutes);

/**
 * @route /api
 * @description Routes for user authentication and management.
 */
app.use('/api', authRoutes);

/**
 * @route /videos
 * @description Routes to interact with Pexels API for fetching videos.
 */
app.use('/videos', videosRoutes);


app.use('/api/ratings', ratingRoutes);

/**
 * @function app.listen
 * @description Starts the Express server and logs accessible routes.
 */
app.listen(port, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
  console.log(`🔍 Ruta de debug disponible en: http://localhost:${port}/debug`);
  console.log(`🎬 Ruta de videos disponible en: http://localhost:${port}/videos/search`);
});
