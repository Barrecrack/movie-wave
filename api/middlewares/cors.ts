import cors, { CorsOptions } from 'cors';

// Configuración de CORS (extraído de index.ts)
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL.trim().replace(/\/$/, '')]
  : ['http://localhost:5173'];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS bloqueado para origen no permitido: ${origin}`);
      callback(new Error('No autorizado por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

export default cors(corsOptions);