import express from "express";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ✅ Buscar videos desde Pexels
router.get("/search", async (req, res) => {
  try {
    const query = (req.query.query as string)?.trim().toLowerCase() || "popular";

    // 🔹 Si el usuario busca algo específico, usamos solo ese término
    if (query !== "popular") {
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12`,
        {
          headers: { Authorization: process.env.PEXELS_API_KEY || "" },
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener videos de Pexels (${response.status})`);
      }

      const data = await response.json();

      const formatted = data.videos.map((v: any) => ({
        id: v.id,
        title: v.user.name || "Video sin título",
        genre: query,
        year: new Date().getFullYear(),
        poster: v.image,
        videoUrl: v.video_files?.[0]?.link || null,
      }));

      return res.json(formatted);
    }

    // 🔹 Si no hay búsqueda específica ("popular"), mostramos varios géneros
    const genres = ["action", "comedy", "romance", "horror", "sci-fi", "adventure", "animation"];

    const allResults = await Promise.all(
      genres.map(async (genre) => {
        const response = await fetch(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(genre)}&per_page=6`,
          {
            headers: { Authorization: process.env.PEXELS_API_KEY || "" },
          }
        );

        if (!response.ok) {
          throw new Error(`Error al obtener videos (${genre})`);
        }

        const data = await response.json();

        return data.videos.map((v: any) => ({
          id: v.id,
          title: v.user.name || "Video sin título",
          genre,
          year: new Date().getFullYear(),
          poster: v.image,
          videoUrl: v.video_files?.[0]?.link || null,
        }));
      })
    );

    // 🔹 Unimos todos los géneros en una sola lista
    const formatted = allResults.flat();

    res.json(formatted);
  } catch (error: any) {
    console.error("❌ Error en /videos/search:", error.message);
    res.status(500).json({ error: "Error al cargar videos" });
  }
});

export default router;
