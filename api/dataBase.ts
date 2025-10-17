import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requiere SSL
});

export async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Conectado a la base de datos de Supabase (PostgreSQL)");
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", (error as Error).message);
    process.exit(1);
  }
}

export default client;
