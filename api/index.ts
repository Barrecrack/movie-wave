import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./dataBase";
import client from "./dataBase";
import { sendRecoveryEmail } from "./email";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

// Conectar base de datos
connectDB();

// === Rutas ===

// Ruta principal
app.get("/", (_, res) => {
  res.send("🚀 Servidor Express conectado a Supabase PostgreSQL y listo con Brevo API.");
});

// Registro
app.post("/api/register", async (req: Request, res: Response) => {
  const { email, password, name, lastname } = req.body;
  try {
    const result = await client.query(
      "INSERT INTO users (email, password, name, lastname) VALUES ($1, crypt($2, gen_salt('bf')), $3, $4) RETURNING id, email, name, lastname;",
      [email, password, name, lastname]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Login
app.post("/api/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await client.query(
      "SELECT * FROM users WHERE email = $1 AND password = crypt($2, password);",
      [email, password]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// Recuperar contraseña
app.post("/api/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  const token = Math.random().toString(36).substring(2); // token simple de ejemplo
  try {
    await sendRecoveryEmail(email, token);
    res.json({ message: "Correo de recuperación enviado" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// === Iniciar servidor ===
app.listen(port, () => console.log(`🌐 Servidor escuchando en http://localhost:${port}`));
