"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
console.log("🚀 [VideoRoutes] Inicializando rutas de videos...");
dotenv_1.default.config();
const router = express_1.default.Router();
router.get("/search", async (req, res) => {
    const startTime = Date.now();
    console.log("➡️ [GET] /videos/search | Petición recibida con query:", req.query.query || "(sin query)");
    try {
        const query = req.query.query?.trim().toLowerCase() || "popular";
        const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
        if (!PEXELS_API_KEY) {
            console.error("❌ [GET] /videos/search | PEXELS_API_KEY no configurada");
            return res.status(500).json({ error: "Configuración del servidor incompleta" });
        }
        console.log(`🔍 [GET] /videos/search | Buscando videos para: "${query}"`);
        if (query !== "popular") {
            const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12`, {
                headers: {
                    Authorization: PEXELS_API_KEY,
                    "Content-Type": "application/json"
                },
            });
            if (!response.ok) {
                console.error(`❌ [PEXELS] Error ${response.status}: ${response.statusText}`);
                throw new Error(`Error al obtener videos de Pexels (${response.status})`);
            }
            const data = await response.json();
            console.log(`✅ [PEXELS] ${data.videos?.length || 0} resultados encontrados para "${query}"`);
            const formatted = data.videos.map((v) => ({
                id: v.id,
                title: v.user?.name || "Video sin título",
                genre: query,
                year: new Date().getFullYear(),
                poster: v.image,
                videoUrl: v.video_files?.[0]?.link || null,
            }));
            const duration = Date.now() - startTime;
            console.log(`⏱️ [GET] /videos/search | Tiempo total: ${duration} ms`);
            return res.json(formatted);
        }
        const genres = ["action", "comedy", "romance", "horror", "sci-fi", "adventure", "animation"];
        console.log(`🎬 [GET] /videos/search | Cargando videos populares de: ${genres.join(", ")}`);
        const allResults = await Promise.all(genres.map(async (genre) => {
            try {
                const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(genre)}&per_page=6`, {
                    headers: {
                        Authorization: PEXELS_API_KEY,
                        "Content-Type": "application/json"
                    },
                });
                if (!response.ok) {
                    console.warn(`⚠️ [PEXELS] Error al obtener ${genre}: ${response.status}`);
                    return [];
                }
                const data = await response.json();
                console.log(`✅ [PEXELS] ${genre}: ${data.videos?.length || 0} videos obtenidos`);
                return data.videos.map((v) => ({
                    id: v.id,
                    title: v.user?.name || "Video sin título",
                    genre,
                    year: new Date().getFullYear(),
                    poster: v.image,
                    videoUrl: v.video_files?.[0]?.link || null,
                }));
            }
            catch (error) {
                console.error(`❌ [PEXELS] Error procesando género "${genre}":`, error);
                return [];
            }
        }));
        const formatted = allResults.flat();
        const duration = Date.now() - startTime;
        console.log(`🎉 [GET] /videos/search | Total de videos cargados: ${formatted.length}`);
        console.log(`⏱️ [GET] /videos/search | Tiempo total: ${duration} ms`);
        res.json(formatted);
    }
    catch (error) {
        console.error("❌ [GET] /videos/search | Error general:", error.message);
        console.error("📛 Stack:", error.stack);
        res.status(500).json({ error: "Error al cargar videos: " + error.message });
    }
});
router.get("/health", (req, res) => {
    console.log("🩺 [GET] /videos/health | Verificando estado del servicio...");
    const keyStatus = process.env.PEXELS_API_KEY ? "✅ Configurada" : "❌ No configurada";
    console.log(`📡 [GET] /videos/health | Estado API Key: ${keyStatus}`);
    res.json({
        status: "OK",
        message: "Ruta de videos funcionando correctamente",
        pexelsKey: keyStatus
    });
    console.log("✅ [GET] /videos/health | Respuesta enviada correctamente.");
});
console.log("✅ [VideoRoutes] Rutas de videos cargadas correctamente.");
exports.default = router;
