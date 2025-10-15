import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = 3000;

// Middleware para permitir JSON
app.use(express.json());

// Ruta principal
app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Servidor Express con TypeScript funcionando correctamente!");
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});