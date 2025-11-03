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

// 🔥 FUNCIÓN PARA OBTENER/CREAR CONTENIDO DESDE ID NUMÉRICO
async function getOrCreateContentId(pexelsId: number | string): Promise<string | null> {
  try {
    console.log(`🔹 Buscando contenido para ID Pexels: ${pexelsId}`);
    
    // Primero buscar si ya existe un contenido con este ID de Pexels
    const { data: existingContent, error: searchError } = await supabase
      .from('Contenido')
      .select('id_contenido')
      .eq('id_externo', pexelsId.toString())
      .single();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no encontrado
      console.error('❌ Error buscando contenido:', searchError.message);
      return null;
    }

    if (existingContent) {
      console.log(`✅ Contenido existente encontrado: ${existingContent.id_contenido}`);
      return existingContent.id_contenido;
    }

    // Si no existe, crear nuevo contenido
    console.log('🔹 Creando nuevo contenido en la base de datos...');
    const newContentId = generateUUID();
    
    const { data: newContent, error: createError } = await supabase
      .from('Contenido')
      .insert([
        {
          id_contenido: newContentId,
          id_externo: pexelsId.toString(), // Guardar el ID de Pexels como referencia
          titulo: `Video ${pexelsId}`,
          descripcion: 'Video obtenido desde Pexels API',
          tipo: 'video',
          fecha: new Date().toISOString().split('T')[0],
          duracion: '00:00',
          calificacion: 0
        }
      ])
      .select('id_contenido')
      .single();

    if (createError) {
      console.error('❌ Error creando contenido:', createError.message);
      return null;
    }

    console.log(`✅ Nuevo contenido creado: ${newContent.id_contenido}`);
    return newContent.id_contenido;
  } catch (error: any) {
    console.error('❌ Error en getOrCreateContentId:', error.message);
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
          id_externo,
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

    console.log(`🔹 ID de contenido recibido: ${id_contenido} (tipo: ${typeof id_contenido})`);

    // Obtener o crear el UUID del contenido
    const contenidoId = await getOrCreateContentId(id_contenido);
    
    if (!contenidoId) {
      return res.status(400).json({ error: 'Error al procesar el contenido' });
    }

    // Verificar si ya existe en favoritos
    const { data: existing, error: checkError } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', contenidoId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando favorito existente:', checkError.message);
      throw checkError;
    }

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
          id_contenido: contenidoId,
          fecha_agregado: new Date().toISOString().split('T')[0]
        }
      ])
      .select(`
        *,
        Contenido (
          id_contenido,
          id_externo,
          titulo,
          descripcion,
          duracion,
          tipo,
          fecha,
          calificacion
        )
      `);

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

    // Obtener el UUID del contenido
    let contenidoId: string;
    
    // Si es un UUID válido, usarlo directamente
    if (isValidUUID(contentId)) {
      contenidoId = contentId;
    } else {
      // Si es numérico, buscar el UUID correspondiente
      const { data: contentData, error: contentError } = await supabase
        .from('Contenido')
        .select('id_contenido')
        .eq('id_externo', contentId.toString())
        .single();

      if (contentError || !contentData) {
        console.error('❌ Contenido no encontrado para ID:', contentId);
        return res.status(404).json({ error: 'Contenido no encontrado' });
      }
      
      contenidoId = contentData.id_contenido;
    }

    console.log(`🔹 Ejecutando DELETE para contenido UUID: ${contenidoId}`);
    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('id_usuario', userId)
      .eq('id_contenido', contenidoId);

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

    // Obtener el UUID del contenido
    let contenidoId: string;
    
    if (isValidUUID(contentId)) {
      contenidoId = contentId;
    } else {
      const { data: contentData, error: contentError } = await supabase
        .from('Contenido')
        .select('id_contenido')
        .eq('id_externo', contentId.toString())
        .single();

      if (contentError || !contentData) {
        // Si no existe el contenido, definitivamente no está en favoritos
        return res.json({ isFavorite: false });
      }
      
      contenidoId = contentData.id_contenido;
    }

    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', contenidoId)
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

// Función para validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default router;