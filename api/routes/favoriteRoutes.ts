import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

const router = express.Router();

// 🔥 FUNCIÓN CORREGIDA PARA OBTENER ID NUMÉRICO DEL USUARIO
async function getUserIdNumerico(token: string): Promise<number | null> {
  try {
    console.log('🔍 Buscando ID numérico del usuario...');
    
    // Usar el token para obtener el usuario de Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Error obteniendo usuario de Auth:', authError?.message);
      return null;
    }

    console.log('📧 Email del usuario Auth:', user.email);
    
    // Buscar en tabla Usuario por email
    const { data, error } = await supabase
      .from('Usuario')
      .select('id_usuario')
      .eq('correo', user.email)
      .single();

    if (error) {
      console.error('❌ Error buscando en tabla Usuario:', error.message);
      return null;
    }

    if (!data) {
      console.error('❌ Usuario no encontrado en tabla Usuario con email:', user.email);
      return null;
    }

    console.log(`✅ ID numérico encontrado: ${data.id_usuario}`);
    return data.id_usuario;
  } catch (error: any) {
    console.error('❌ Error en getUserIdNumerico:', error.message);
    return null;
  }
}

/**
 * @route GET /my-favorites
 */
router.get('/my-favorites', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', user.id);
    
    // Obtener ID numérico
    const userIdNum = await getUserIdNumerico(token);
    if (!userIdNum) {
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    console.log('🔹 Ejecutando consulta Supabase...');
    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userIdNum);  // 🔥 Usar ID numérico

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
 */
router.post('/', async (req: Request, res: Response) => {
  console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Obtener ID numérico
    const userIdNum = await getUserIdNumerico(token);
    if (!userIdNum) {
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    const { id_contenido } = req.body;
    const idContenidoNum = parseInt(id_contenido);
    if (isNaN(idContenidoNum)) {
      return res.status(400).json({ error: 'ID de contenido inválido' });
    }

    // Verificar si ya existe
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

    // Insertar favorito
    const { data, error } = await supabase
      .from('Favoritos')
      .insert([
        {
          id_favorito: generateUUID(),
          id_usuario: userIdNum,  // 🔥 ID numérico
          id_contenido: idContenidoNum,
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
 */
router.delete('/:contentId', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [DELETE FAVORITE] Eliminando favorito:', req.params);
    
    // Obtener ID numérico
    const userIdNum = await getUserIdNumerico(token);
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
 */
router.get('/check/:contentId', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🟢 [CHECK FAVORITE] Verificando favorito:', req.params);
    
    // Obtener ID numérico
    const userIdNum = await getUserIdNumerico(token);
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

// Función para generar UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;