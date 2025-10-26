import express from "express";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ✅ Buscar videos desde Pexels
router.get("/search", async (req, res) => {
  try {
    const query = (req.query.query as string) || "popular";

    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error al obtener videos de Pexels (${response.status})`);
    }

    const data = await response.json();

    // ✅ Mapeamos solo los datos necesarios
    const formatted = data.videos.map((v: any) => ({
      id: v.id,
      title: v.user.name || "Video sin título",
      genre: query,
      year: new Date().getFullYear(),
      poster: v.image,
      videoUrl: v.video_files?.[0]?.link || null,
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error("❌ Error en /videos/search:", error.message);
    res.status(500).json({ error: "Error al cargar videos" });
  }
});

export default router;
