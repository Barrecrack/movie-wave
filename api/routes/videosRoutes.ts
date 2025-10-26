import express from "express";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ✅ Buscar videos desde Pexels
router.get("/search", async (req, res) => {
  try {
    const query = (req.query.query as string)?.trim().toLowerCase() || "popular";
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

    // 🔹 Validar que exista la API key
    if (!PEXELS_API_KEY) {
      console.error("❌ PEXELS_API_KEY no configurada");
      return res.status(500).json({ error: "Configuración del servidor incompleta" });
    }

    console.log(`🔍 Buscando videos: "${query}"`);

    // 🔹 Si el usuario busca algo específico, usamos solo ese término
    if (query !== "popular") {
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12`,
        {
          headers: { 
            Authorization: PEXELS_API_KEY,
            "Content-Type": "application/json"
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Error Pexels API: ${response.status} - ${response.statusText}`);
        throw new Error(`Error al obtener videos de Pexels (${response.status})`);
      }

      const data = await response.json();
      console.log(`✅ Encontrados ${data.videos?.length || 0} videos para "${query}"`);

      const formatted = data.videos.map((v: any) => ({
        id: v.id,
        title: v.user?.name || "Video sin título",
        genre: query,
        year: new Date().getFullYear(),
        poster: v.image,
        videoUrl: v.video_files?.[0]?.link || null,
      }));

      return res.json(formatted);
    }

    // 🔹 Si no hay búsqueda específica ("popular"), mostramos varios géneros
    const genres = ["action", "comedy", "romance", "horror", "sci-fi", "adventure", "animation"];
    
    console.log(`🎬 Cargando videos populares de géneros: ${genres.join(", ")}`);

    const allResults = await Promise.all(
      genres.map(async (genre) => {
        try {
          const response = await fetch(
            `https://api.pexels.com/videos/search?query=${encodeURIComponent(genre)}&per_page=6`,
            {
              headers: { 
                Authorization: PEXELS_API_KEY,
                "Content-Type": "application/json"
              },
            }
          );

          if (!response.ok) {
            console.warn(`⚠️ Error obteniendo ${genre}: ${response.status}`);
            return [];
          }

          const data = await response.json();
          console.log(`✅ ${genre}: ${data.videos?.length || 0} videos`);

          return data.videos.map((v: any) => ({
            id: v.id,
            title: v.user?.name || "Video sin título",
            genre,
            year: new Date().getFullYear(),
            poster: v.image,
            videoUrl: v.video_files?.[0]?.link || null,
          }));
        } catch (error) {
          console.error(`❌ Error en género ${genre}:`, error);
          return [];
        }
      })
    );

    // 🔹 Unimos todos los géneros en una sola lista
    const formatted = allResults.flat();
    console.log(`🎉 Total de videos cargados: ${formatted.length}`);

    res.json(formatted);
  } catch (error: any) {
    console.error("❌ Error en /videos/search:", error.message);
    console.error("📛 Stack:", error.stack);
    res.status(500).json({ error: "Error al cargar videos: " + error.message });
  }
});

// ✅ Endpoint de salud para verificar que la ruta funciona
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Ruta de videos funcionando",
    pexelsKey: process.env.PEXELS_API_KEY ? "✅ Configurada" : "❌ No configurada"
  });
});

export default router;