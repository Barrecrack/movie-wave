"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
router.get("/search", async (req, res) => {
    try {
        const query = req.query.query || "popular";
        const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=10`, {
            headers: {
                Authorization: process.env.PEXELS_API_KEY || "",
            },
        });
        if (!response.ok) {
            throw new Error(`Error al obtener videos de Pexels (${response.status})`);
        }
        const data = await response.json();
        const formatted = data.videos.map((v) => ({
            id: v.id,
            title: v.user.name || "Video sin título",
            genre: query,
            year: new Date().getFullYear(),
            poster: v.image,
            videoUrl: v.video_files?.[0]?.link || null,
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error("❌ Error en /videos/search:", error.message);
        res.status(500).json({ error: "Error al cargar videos" });
    }
});
exports.default = router;
