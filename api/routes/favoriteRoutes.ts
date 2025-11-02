import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

const router = express.Router();

/**
 * @route GET /my-favorites
 * @description Get all favorites for the authenticated user
 * @returns {Array} List of favorite items.
 */
router.get('/my-favorites', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    // Verificar el usuario desde el token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', user.id);
    
    console.log('🔹 Ejecutando consulta Supabase...');
    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', user.id);

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
 * @description Add a new favorite for a user. Checks if it is already in favorites.
 * @body {string} id_contenido - Content ID to add to favorites.
 * @returns {Object} The newly added favorite.
 */
router.post('/', async (req: Request, res: Response) => {
  console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    // Verificar el usuario desde el token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { id_contenido } = req.body;
    const id_usuario = user.id;

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
          id_usuario: parseInt(id_usuario),
          id_contenido: parseInt(id_contenido),
          fecha_agregado: new Date().toISOString()
        }
      ])
      .select('*');

    if (error) throw error;
    
    console.log('✅ Favorito agregado correctamente');
    res.status(201).json(data[0]);
  } catch (error: any) {
    console.error('❌ Error agregando favorito:', error.message);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

/**
 * @route DELETE /:contentId
 * @description Remove a specific favorite for the authenticated user by content ID.
 * @param {string} contentId - The content ID to remove from favorites.
 * @returns {Object} Confirmation message.
 */
router.delete('/:contentId', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    // Verificar el usuario desde el token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [DELETE FAVORITE] Eliminando favorito:', req.params);
    
    console.log('🔹 Ejecutando DELETE en Supabase...');
    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('id_usuario', user.id)
      .eq('id_contenido', req.params.contentId);

    if (error) {
      console.error('❌ ERROR SUPABASE DETALLADO (DELETE):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
    console.log('✅ Favorito eliminado correctamente');
    res.json({ message: 'Favorito eliminado' });
  } catch (error: any) {
    console.error('❌ ERROR COMPLETO eliminando favorito:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Error al eliminar favorito',
      details: error.message 
    });
  }
});

/**
 * @route GET /check/:contentId
 * @description Check whether a specific content item is already in the authenticated user's favorites.
 * @param {string} contentId - Content ID to check.
 * @returns {Object} Boolean indicating if the content is a favorite.
 */
router.get('/check/:contentId', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    // Verificar el usuario desde el token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [CHECK FAVORITE] Verificando favorito:', req.params);
    
    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', user.id)
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