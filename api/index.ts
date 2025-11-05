/**
 * @file index.ts
 * @description Entry point for the Express server configuration.
 * Loads environment variables, initializes middleware, and mounts routes for authentication,
 * videos, favorites, and ratings. Ensures server connectivity to Supabase, Brevo API, and Pexels.
 * @module api
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import corsMiddleware from './middlewares/cors';
import authRoutes from './routes/authRoutes';
import videosRoutes from './routes/videosRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
import ratingRoutes from './routes/ratingRoutes';

/**
 * Express application instance.
 * @constant
 * @type {import('express').Express}
 */
const app = express();

/**
 * Server port number from environment variables or default (3000).
 * @constant
 * @type {number|string}
 */
const port = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());

/**
 * Root route to confirm the server is running and connected to external services.
 *
 * @route GET /
 * @group Root - Health check
 * @returns {string} 200 - Confirmation message with connected APIs.
 */
app.get('/', (_: Request, res: Response) => {
  res.send('🚀 Servidor Express conectado a Supabase, Brevo API y Pexels listo.');
});

/**
 * Debug route to check environment configuration and API key statuses.
 *
 * @route GET /debug
 * @group Debug - Server diagnostics
 * @returns {object} 200 - JSON with environment and configuration details.
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
 * Routes related to user's favorite content management.
 *
 * @route /api/favorites
 * @group Favorites - Manage favorite videos
 */
app.use('/api/favorites', favoriteRoutes);

/**
 * Routes for user authentication and profile management.
 *
 * @route /api
 * @group Authentication - Register, login, password recovery
 */
app.use('/api', authRoutes);

/**
 * Routes to interact with Pexels API for fetching and managing video content.
 *
 * @route /videos
 * @group Videos - Video browsing and retrieval
 */
app.use('/videos', videosRoutes);

/**
 * Routes for user rating management (videos, favorites, etc.).
 *
 * @route /api/ratings
 * @group Ratings - User feedback and rating system
 */
app.use('/api/ratings', ratingRoutes);

/**
 * Starts the Express server and logs available routes to the console.
 *
 * @function
 * @name app.listen
 * @returns {void}
 */
app.listen(port, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${port}`);
  console.log(`🔍 Ruta de debug disponible en: http://localhost:${port}/debug`);
  console.log(`🎬 Ruta de videos disponible en: http://localhost:${port}/videos/search`);
});
