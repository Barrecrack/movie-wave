import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

const router = express.Router();

// 🔥 FUNCIÓN CORREGIDA PARA OBTENER UUID DEL USUARIO
async function getUserIdFromAuth(token: string): Promise<string | null> {
  try {
    console.log('🔍 Buscando usuario autenticado...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Error obteniendo usuario de Auth:', authError?.message);
      return null;
    }

    console.log('✅ Usuario Auth encontrado:', user.id);
    return user.id;
  } catch (error: any) {
    console.error('❌ Error en getUserIdFromAuth:', error.message);
    return null;
  }
}

/**
 * @route GET /my-favorites
 * @description Obtiene todos los favoritos del usuario autenticado
 */
router.get('/my-favorites', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', userId);
    
    const { data, error } = await supabase
      .from('Favoritos')
      .select(`
        *,
        Contenido (
          id_contenido,
          titulo,
          descripcion,
          duracion,
          tipo,
          fecha,
          calificacion
        )
      `)
      .eq('id_usuario', userId);

    if (error) {
      console.error('❌ ERROR SUPABASE DETALLADO:', error);
      throw error;
    }
    
    console.log(`✅ ${data?.length || 0} favoritos encontrados`);
    res.json(data || []);
  } catch (error: any) {
    console.error('❌ ERROR COMPLETO obteniendo favoritos:', error.message);
    res.status(500).json({ 
      error: 'Error al obtener favoritos',
      details: error.message 
    });
  }
});

/**
 * @route POST /
 * @description Agrega un contenido a favoritos
 */
router.post('/', async (req: Request, res: Response) => {
  console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { id_contenido } = req.body;
    
    if (!id_contenido) {
      return res.status(400).json({ error: 'ID de contenido requerido' });
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', id_contenido)
      .single();

    if (existing) {
      console.log('⚠️ Ya existe en favoritos');
      return res.status(400).json({ error: 'Ya está en favoritos' });
    }

    // Insertar favorito
    const { data, error } = await supabase
      .from('Favoritos')
      .insert([
        {
          id_favorito: generateUUID(),
          id_usuario: userId,
          id_contenido: id_contenido,
          fecha_agregado: new Date().toISOString().split('T')[0]
        }
      ])
      .select('*');

    if (error) {
      console.error('❌ ERROR SUPABASE DETALLADO (INSERT):', error);
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
 * @description Elimina un contenido de favoritos
 */
router.delete('/:contentId', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [DELETE FAVORITE] Eliminando favorito:', req.params);
    
    const contentId = req.params.contentId;
    if (!contentId) {
      return res.status(400).json({ error: 'ID de contenido requerido' });
    }

    console.log('🔹 Ejecutando DELETE en Supabase...');
    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('id_usuario', userId)
      .eq('id_contenido', contentId);

    if (error) {
      console.error('❌ ERROR SUPABASE DETALLADO (DELETE):', error);
      throw error;
    }
    
    console.log('✅ Favorito eliminado correctamente');
    res.json({ message: 'Favorito eliminado' });
  } catch (error: any) {
    console.error('❌ ERROR COMPLETO eliminando favorito:', error.message);
    res.status(500).json({ 
      error: 'Error al eliminar favorito',
      details: error.message 
    });
  }
});

/**
 * @route GET /check/:contentId
 * @description Verifica si un contenido está en favoritos
 */
router.get('/check/:contentId', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [CHECK FAVORITE] Verificando favorito:', req.params);
    
    const contentId = req.params.contentId;
    if (!contentId) {
      return res.status(400).json({ error: 'ID de contenido requerido' });
    }

    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', contentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    
    res.json({ isFavorite: !!data });
  } catch (error: any) {
    console.error('❌ Error verificando favorito:', error.message);
    res.status(500).json({ error: 'Error al verificar favorito' });
  }
});

// Función para generar UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;