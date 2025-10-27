"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const router = express_1.default.Router();
router.get('/:userId', async (req, res) => {
    console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', req.params.userId);
    try {
        console.log('🔹 Ejecutando consulta Supabase...');
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .select(`
        *,
        Contenido:id_contenido (
          id_contenido,
          titulo,
          poster,
          genero,
          año,
          descripcion,
          duracion,
          video_url
        )
      `)
            .eq('id_usuario', req.params.userId);
        if (error) {
            console.error('❌ ERROR SUPABASE DETALLADO:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }
        console.log(`✅ ${data?.length || 0} favoritos encontrados`);
        res.json(data || []);
    }
    catch (error) {
        console.error('❌ ERROR COMPLETO obteniendo favoritos:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({
            error: 'Error al obtener favoritos',
            details: error.message
        });
    }
});
router.post('/', async (req, res) => {
    console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
    const { id_usuario, id_contenido } = req.body;
    try {
        const { data: contenido, error: contenidoError } = await supabase_1.supabase
            .from('Contenido')
            .select('*')
            .eq('id_contenido', id_contenido)
            .single();
        if (contenidoError) {
            console.error('❌ Contenido no encontrado:', contenidoError);
            return res.status(404).json({ error: 'Contenido no encontrado' });
        }
        const { data: existing } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', id_usuario)
            .eq('id_contenido', id_contenido)
            .single();
        if (existing) {
            console.log('⚠️ Ya existe en favoritos');
            return res.status(400).json({ error: 'Ya está en favoritos' });
        }
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .insert([
            {
                id_usuario,
                id_contenido,
                fecha_agregado: new Date().toISOString()
            }
        ])
            .select(`
        *,
        Contenido:id_contenido (
          id_contenido,
          titulo,
          poster,
          genero,
          año,
          descripcion,
          duracion,
          video_url
        )
      `);
        if (error)
            throw error;
        console.log('✅ Favorito agregado correctamente');
        res.status(201).json(data[0]);
    }
    catch (error) {
        console.error('❌ Error agregando favorito:', error.message);
        res.status(500).json({ error: 'Error al agregar favorito' });
    }
});
router.delete("/", async (req, res) => {
    try {
        const { userId, contentId } = req.body;
        console.log("🗑️ Request to delete favorite:", { userId, contentId });
        const { data, error } = await supabase_1.supabase
            .from("Favoritos")
            .delete()
            .match({ id_usuario: userId, id_contenido: contentId })
            .select();
        if (error) {
            console.error("❌ Error deleting favorite:", error.message);
            return res
                .status(500)
                .json({ error: "Error deleting favorite", details: error.message });
        }
        if (!data || data.length === 0) {
            console.warn("⚠️ No favorite found to delete");
            return res.status(404).json({ error: "Favorite not found" });
        }
        console.log("✅ Favorite deleted successfully:", data);
        res.json({ message: "Favorite deleted", deleted: data });
    }
    catch (error) {
        console.error("💥 Unexpected error deleting favorite:", error);
        res.status(500).json({
            error: "Unexpected error deleting favorite",
            details: error.message,
        });
    }
});
router.get('/:userId/:contentId/check', async (req, res) => {
    console.log('🟢 [CHECK FAVORITE] Verificando favorito:', req.params);
    try {
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', req.params.userId)
            .eq('id_contenido', req.params.contentId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        res.json({ isFavorite: !!data });
    }
    catch (error) {
        console.error('❌ Error verificando favorito:', error.message);
        res.status(500).json({ error: 'Error al verificar favorito' });
    }
});
exports.default = router;
