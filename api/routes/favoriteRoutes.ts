import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

const router = express.Router();

/**
 * @route GET /:userId
 * @description Get all favorites for a specific user with related content information.
 * @param {string} userId - The ID of the user whose favorites will be retrieved.
 * @returns {Array} List of favorite items including their content details.
 */
router.get('/:userId', async (req: Request, res: Response) => {
  console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', req.params.userId);

  try {
    console.log('🔹 Ejecutando consulta Supabase...');
    const { data, error } = await supabase
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
  } catch (error: any) {
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

/**
 * @route POST /
 * @description Add a new favorite for a user. Checks if the content exists and if it is already in favorites.
 * @body {string} id_usuario - User ID.
 * @body {string} id_contenido - Content ID to add to favorites.
 * @returns {Object} The newly added favorite with content details.
 */
router.post('/', async (req: Request, res: Response) => {
  console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
  const { id_usuario, id_contenido } = req.body;

  try {
    // Check if the content exists
    const { data: contenido, error: contenidoError } = await supabase
      .from('Contenido')
      .select('*')
      .eq('id_contenido', id_contenido)
      .single();

    if (contenidoError) {
      console.error('❌ Contenido no encontrado:', contenidoError);
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    // Check if it already exists in favorites
    const { data: existing } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', id_usuario)
      .eq('id_contenido', id_contenido)
      .single();

    if (existing) {
      console.log('⚠️ Ya existe en favoritos');
      return res.status(400).json({ error: 'Ya está en favoritos' });
    }

    // Add to favorites
    const { data, error } = await supabase
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

    if (error) throw error;

    console.log('✅ Favorito agregado correctamente');
    res.status(201).json(data[0]);
  } catch (error: any) {
    console.error('❌ Error agregando favorito:', error.message);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

/**
 * @route DELETE /:userId/:contentId
 * @description Remove a specific favorite for a user by content ID.
 * @param {string} userId - The user ID.
 * @param {string} contentId - The content ID to remove from favorites.
 * @returns {Object} Confirmation message.
 */
router.delete("/", async (req, res) => {
  try {
    const { userId, contentId } = req.body;

    console.log("🗑️ Request to delete favorite:", { userId, contentId });

    const { data, error } = await supabase
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
  } catch (error: any) {
    console.error("💥 Unexpected error deleting favorite:", error);
    res.status(500).json({
      error: "Unexpected error deleting favorite",
      details: error.message,
    });
  }
});

/**
 * @route GET /:userId/:contentId/check
 * @description Check whether a specific content item is already in a user's favorites.
 * @param {string} userId - User ID.
 * @param {string} contentId - Content ID to check.
 * @returns {Object} Boolean indicating if the content is a favorite.
 */
router.get('/:userId/:contentId/check', async (req: Request, res: Response) => {
  console.log('🟢 [CHECK FAVORITE] Verificando favorito:', req.params);

  try {
    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', req.params.userId)
      .eq('id_contenido', req.params.contentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

    res.json({ isFavorite: !!data });
  } catch (error: any) {
    console.error('❌ Error verificando favorito:', error.message);
    res.status(500).json({ error: 'Error al verificar favorito' });
  }
});

export default router;
