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
    
    // 🔥 NUEVO: Obtener el ID numérico del usuario
    const userIdNum = await getUserIdNumerico(user.id);
    if (!userIdNum) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('🔹 Ejecutando consulta Supabase...');
    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userIdNum);  // 🔥 Usar ID numérico

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

    // 🔥 NUEVO: Obtener el ID numérico del usuario
    const userIdNum = await getUserIdNumerico(user.id);
    if (!userIdNum) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { id_contenido } = req.body;

    // Convertir id_contenido a número
    const idContenidoNum = parseInt(id_contenido);
    if (isNaN(idContenidoNum)) {
      return res.status(400).json({ error: 'ID de contenido inválido' });
    }

    // Check if it already exists in favorites
    const { data: existing } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userIdNum)  // 🔥 Usar ID numérico
      .eq('id_contenido', idContenidoNum)
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
          id_favorito: generateUUID(),     // 🔥 UUID
          id_usuario: userIdNum,           // 🔥 NUMÉRICO
          id_contenido: idContenidoNum,    // 🔥 NUMÉRICO
          fecha_agregado: new Date().toISOString().split('T')[0] // 🔥 DATE (solo fecha)
        }
      ])
      .select('*');

    if (error) {
      console.error('❌ ERROR SUPABASE DETALLADO (INSERT):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
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
    
    // 🔥 NUEVO: Obtener el ID numérico del usuario
    const userIdNum = await getUserIdNumerico(user.id);
    if (!userIdNum) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Convertir contentId a número
    const contentIdNum = parseInt(req.params.contentId);
    if (isNaN(contentIdNum)) {
      return res.status(400).json({ error: 'ID de contenido inválido' });
    }

    console.log('🔹 Ejecutando DELETE en Supabase...');
    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('id_usuario', userIdNum)  // 🔥 Usar ID numérico
      .eq('id_contenido', contentIdNum);

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
    
    // 🔥 NUEVO: Obtener el ID numérico del usuario
    const userIdNum = await getUserIdNumerico(user.id);
    if (!userIdNum) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Convertir contentId a número
    const contentIdNum = parseInt(req.params.contentId);
    if (isNaN(contentIdNum)) {
      return res.status(400).json({ error: 'ID de contenido inválido' });
    }

    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userIdNum)  // 🔥 Usar ID numérico
      .eq('id_contenido', contentIdNum)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    
    res.json({ isFavorite: !!data });
  } catch (error: any) {
    console.error('❌ Error verificando favorito:', error.message);
    res.status(500).json({ error: 'Error al verificar favorito' });
  }
});

// 🔥 NUEVA FUNCIÓN: Obtener ID numérico del usuario
async function getUserIdNumerico(token: string): Promise<number | null> {
  try {
    // Usar el token directamente para obtener el usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user?.email) {
      console.error('❌ Error obteniendo usuario de Auth:', authError?.message);
      return null;
    }

    console.log('🔍 Buscando usuario por email:', user.email);
    
    // Buscar en la tabla usuario
    const { data, error } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('correo', user.email)
      .single();

    if (error) {
      console.error('❌ Error buscando usuario en BD:', error.message);
      return null;
    }

    if (!data) {
      console.error('❌ Usuario no encontrado en tabla usuario con email:', user.email);
      return null;
    }

    console.log(`✅ ID numérico encontrado: ${data.id_usuario}`);
    return data.id_usuario;
  } catch (error: any) {
    console.error('❌ Error en getUserIdNumerico:', error.message);
    return null;
  }
}

// Función para generar UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;