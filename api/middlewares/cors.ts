import cors, { CorsOptions } from 'cors';

console.log('🔹 Configurando CORS...');

// Mostrar las URLs permitidas
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
      .map(url => url.trim().replace(/\/$/, ''))
      .filter(url => url.length > 0)
  : ['http://localhost:5173'];

console.log('✅ Orígenes permitidos:', allowedOrigins);

// Configuración de CORS (extraído de index.ts)
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    console.log('🌍 Solicitud CORS desde origen:', origin || '(sin origen)');
    if (!origin) {
      console.log('🟢 Solicitud sin origen (permitida).');
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleanOrigin)) {
      console.log(`🟢 CORS permitido para: ${cleanOrigin}`);
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

console.log('✅ Middleware CORS configurado correctamente.');

export default cors(corsOptions);
