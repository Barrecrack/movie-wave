import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

console.log('🚀 [FavoriteRoutes] Inicializando rutas de favoritos SIMPLIFICADAS...');

const router = express.Router();

/* ──────────────────────────────────────────────── */
/* 🔹 FUNCIÓN: Obtener UUID del usuario desde token */
/* ──────────────────────────────────────────────── */
async function getUserIdFromAuth(token: string): Promise<string | null> {
  console.log('🔑 [AUTH] Verificando token del usuario...');
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.warn('⚠️ [AUTH] Token inválido o usuario no encontrado');
      return null;
    }
    return user.id;
  } catch (error) {
    console.error('💥 [AUTH] Error interno en getUserIdFromAuth:', error);
    return null;
  }
}

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Agregar contenido a favoritos           */
/* ──────────────────────────────────────────────── */
router.post('/', async (req: Request, res: Response) => {
  console.log('➡️ [ADD FAVORITE] Petición para agregar favorito:', req.body);

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.error('❌ [ADD FAVORITE] Token no proporcionado');
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const userId = await getUserIdFromAuth(token);
    console.log(`🔹 [ADD FAVORITE] User ID obtenido: ${userId}`);
    
    if (!userId) {
      console.error('❌ [ADD FAVORITE] No se pudo obtener user ID del token');
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { id_contenido } = req.body;
    if (!id_contenido) {
      console.error('❌ [ADD FAVORITE] ID de contenido no proporcionado');
      return res.status(400).json({ error: 'ID de contenido requerido' });
    }

    console.log(`🔹 [ADD FAVORITE] ID de Pexels recibido: ${id_contenido}`);

    // 🔥 PRIMERO: Buscar si ya existe el contenido en la tabla Contenido
    const { data: contenidoExistente, error: contenidoError } = await supabase
      .from('Contenido')
      .select('id_contenido')
      .eq('id_externo', id_contenido.toString())
      .single();

    let contenidoId: string;

    if (contenidoExistente) {
      // Si ya existe, usar ese ID
      contenidoId = contenidoExistente.id_contenido;
      console.log(`✅ [ADD FAVORITE] Contenido existente encontrado: ${contenidoId}`);
    } else {
      // Si no existe, crear uno nuevo
      console.log('🆕 [ADD FAVORITE] Creando nuevo contenido...');
      const newContentId = generateUUID();
      
      const { data: nuevoContenido, error: createError } = await supabase
        .from('Contenido')
        .insert([{
          id_contenido: newContentId,
          id_externo: id_contenido.toString(),
          titulo: `Video ${id_contenido}`,
          tipo: 'video',
          fecha: new Date().toISOString().split('T')[0],
          duracion: '00:00',
          calificacion: 0
        }])
        .select('id_contenido')
        .single();

      if (createError) {
        console.error('❌ [ADD FAVORITE] Error creando contenido:', createError);
        return res.status(400).json({ error: 'Error al procesar el contenido' });
      }

      contenidoId = nuevoContenido.id_contenido;
      console.log(`✅ [ADD FAVORITE] Nuevo contenido creado: ${contenidoId}`);
    }

    // 🔥 VERIFICAR SI YA EXISTE EN FAVORITOS
    const { data: existing, error: checkError } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', contenidoId)
      .single();

    if (existing) {
      console.warn('⚠️ [ADD FAVORITE] El contenido ya está en favoritos');
      return res.status(400).json({ error: 'Ya está en favoritos' });
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [ADD FAVORITE] Error verificando existencia:', checkError);
      throw checkError;
    }

    // INSERTAR FAVORITO
    const favoritoData = {
      id_favorito: generateUUID(),
      id_usuario: userId,
      id_contenido: contenidoId,
      fecha_agregado: new Date().toISOString().split('T')[0]
    };

    console.log('🔹 [ADD FAVORITE] Insertando favorito:', favoritoData);

    const { data, error } = await supabase
      .from('Favoritos')
      .insert([favoritoData])
      .select('*');

    if (error) {
      console.error('❌ [ADD FAVORITE] Error insertando en Supabase:', error);
      throw error;
    }

    console.log('✅ [ADD FAVORITE] Favorito agregado correctamente');
    res.status(201).json({ 
      message: 'Favorito agregado correctamente',
      favorito: data[0]
    });
  } catch (error: any) {
    console.error('💥 [ADD FAVORITE] Error agregando favorito:', error.message);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Verificar si un contenido está en favoritos */
/* ──────────────────────────────────────────────── */
router.get('/check/:contentId', async (req: Request, res: Response) => {
  console.log('➡️ [CHECK FAVORITE] Verificando favorito:', req.params);

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const contentId = req.params.contentId;
    if (!contentId) return res.status(400).json({ error: 'ID de contenido requerido' });

    // 🔥 BUSCAR POR id_externo EN CONTENIDO
    const { data: contenido } = await supabase
      .from('Contenido')
      .select('id_contenido')
      .eq('id_externo', contentId.toString())
      .single();

    if (!contenido) return res.json({ isFavorite: false });

    // VERIFICAR SI ESTÁ EN FAVORITOS
    const { data } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', contenido.id_contenido)
      .single();

    res.json({ isFavorite: !!data });
    console.log(`🔎 [CHECK FAVORITE] Resultado: ${!!data}`);
  } catch (error: any) {
    console.error('💥 [CHECK FAVORITE] Error verificando favorito:', error.message);
    res.status(500).json({ error: 'Error al verificar favorito' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Obtener favoritos del usuario           */
/* ──────────────────────────────────────────────── */
router.get('/my-favorites', async (req: Request, res: Response) => {
  console.log('➡️ [GET FAVORITES] Petición recibida para obtener favoritos');

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    console.log(`🟢 [GET FAVORITES] Consultando favoritos del usuario: ${userId}`);

    // 🔥 OBTENER FAVORITOS CON INFORMACIÓN DEL CONTENIDO
    const { data: favoritos, error } = await supabase
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
          calificacion,
          poster,
          genero
        )
      `)
      .eq('id_usuario', userId);

    if (error) throw error;

    console.log(`✅ [GET FAVORITES] ${favoritos?.length || 0} favoritos encontrados`);
    res.json(favoritos || []);
  } catch (error: any) {
    console.error('💥 [GET FAVORITES] Error al obtener favoritos:', error.message);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Eliminar de favoritos                   */
/* ──────────────────────────────────────────────── */
router.delete('/:contentId', async (req: Request, res: Response) => {
  console.log('➡️ [DELETE FAVORITE] Petición recibida:', req.params);

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const contentId = req.params.contentId;
    if (!contentId) return res.status(400).json({ error: 'ID de contenido requerido' });

    console.log(`🗑️ [DELETE FAVORITE] Eliminando favorito con ID Pexels: ${contentId}`);

    // 🔥 BUSCAR CONTENIDO POR id_externo
    const { data: contenido, error: contenidoError } = await supabase
      .from('Contenido')
      .select('id_contenido')
      .eq('id_externo', contentId.toString())
      .single();

    if (contenidoError || !contenido) {
      console.error('❌ [DELETE FAVORITE] Contenido no encontrado');
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    // ELIMINAR DE FAVORITOS
    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('id_usuario', userId)
      .eq('id_contenido', contenido.id_contenido);

    if (error) throw error;

    console.log('✅ [DELETE FAVORITE] Favorito eliminado correctamente');
    res.json({ message: 'Favorito eliminado' });
  } catch (error: any) {
    console.error('💥 [DELETE FAVORITE] Error eliminando favorito:', error.message);
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔧 Utilidades                                    */
/* ──────────────────────────────────────────────── */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

console.log('✅ [FavoriteRoutes] Rutas de favoritos cargadas correctamente.');

export default router;