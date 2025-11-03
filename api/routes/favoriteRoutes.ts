import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

console.log('🚀 [FavoriteRoutes] Inicializando rutas de favoritos...');

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

    console.log(`🧩 [AUTH] Usuario autenticado Supabase ID: ${user.id}`);

    // Buscar el ID en la tabla Usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from('Usuario')
      .select('id_usuario')
      .eq('id_usuario', user.id)
      .single();

    if (usuarioError || !usuario) {
      console.error('❌ [AUTH] Usuario no encontrado en tabla Usuario');
      return null;
    }

    console.log(`✅ [AUTH] Usuario encontrado en BD: ${usuario.id_usuario}`);
    return usuario.id_usuario;
  } catch (error) {
    console.error('💥 [AUTH] Error interno en getUserIdFromAuth:', error);
    return null;
  }
}

/* ──────────────────────────────────────────────── */
/* 🔹 FUNCIÓN: Obtener o crear contenido por ID     */
/* ──────────────────────────────────────────────── */
async function getOrCreateContentId(pexelsId: number | string, movieData?: any): Promise<string | null> {
  const startTime = Date.now();
  console.log(`🎬 [CONTENT] Buscando contenido con ID externo: ${pexelsId}`);

  try {
    const { data: existingContent, error: searchError } = await supabase
      .from('Contenido')
      .select('id_contenido')
      .eq('id_externo', pexelsId.toString())
      .single();

    if (existingContent) {
      console.log(`✅ [CONTENT] Contenido existente: ${existingContent.id_contenido}`);
      return existingContent.id_contenido;
    }

    console.log('🆕 [CONTENT] Creando nuevo contenido en la base de datos...');
    const newContentId = generateUUID();

    const contentData = {
      id_contenido: newContentId,
      id_externo: pexelsId.toString(),
      titulo: movieData?.title || `Video ${pexelsId}`,
      descripcion: movieData?.description || 'Video obtenido desde Pexels API',
      tipo: 'video',
      fecha: new Date().toISOString().split('T')[0],
      duracion: '00:00',
      calificacion: 0,
      poster: movieData?.poster || null,
      genero: movieData?.genre || 'general'
    };

    const { data: newContent, error: createError } = await supabase
      .from('Contenido')
      .insert([contentData])
      .select('id_contenido')
      .single();

    if (createError) {
      console.error('❌ [CONTENT] Error creando contenido:', createError.message);
      return null;
    }

    console.log(`✅ [CONTENT] Nuevo contenido creado con ID: ${newContent.id_contenido}`);
    console.log(`⏱️ [CONTENT] Tiempo total: ${Date.now() - startTime} ms`);
    return newContent.id_contenido;
  } catch (error: any) {
    console.error('💥 [CONTENT] Error interno en getOrCreateContentId:', error.message);
    return null;
  }
}

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Obtener todos los favoritos del usuario */
/* ──────────────────────────────────────────────── */
router.get('/my-favorites', async (req: Request, res: Response) => {
  console.log('➡️ [GET FAVORITES] Petición recibida para obtener favoritos');
  const startTime = Date.now();

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    console.log(`🟢 [GET FAVORITES] Consultando favoritos del usuario: ${userId}`);

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

    if (error) throw error;

    console.log(`✅ [GET FAVORITES] ${data?.length || 0} favoritos encontrados`);
    console.log(`⏱️ [GET FAVORITES] Tiempo total: ${Date.now() - startTime} ms`);
    res.json(data || []);
  } catch (error: any) {
    console.error('💥 [GET FAVORITES] Error al obtener favoritos:', error.message);
    res.status(500).json({ error: 'Error al obtener favoritos', details: error.message });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Agregar contenido a favoritos           */
/* ──────────────────────────────────────────────── */
router.post('/', async (req: Request, res: Response) => {
  console.log('➡️ [ADD FAVORITE] Petición para agregar favorito:', req.body);
  const startTime = Date.now();

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const { id_contenido } = req.body;
    if (!id_contenido) return res.status(400).json({ error: 'ID de contenido requerido' });

    console.log(`🔹 [ADD FAVORITE] ID de contenido recibido: ${id_contenido}`);

    const contenidoId = await getOrCreateContentId(id_contenido);
    if (!contenidoId) return res.status(400).json({ error: 'Error al procesar el contenido' });

    // Verificar si ya existe
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

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

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

    if (error) throw error;

    console.log('✅ [ADD FAVORITE] Favorito agregado correctamente');
    console.log(`⏱️ [ADD FAVORITE] Tiempo total: ${Date.now() - startTime} ms`);
    res.status(201).json(data[0]);
  } catch (error: any) {
    console.error('💥 [ADD FAVORITE] Error agregando favorito:', error.message);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Eliminar contenido de favoritos         */
/* ──────────────────────────────────────────────── */
router.delete('/:contentId', async (req: Request, res: Response) => {
  console.log('➡️ [DELETE FAVORITE] Petición recibida:', req.params);
  const startTime = Date.now();

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const contentId = req.params.contentId;
    if (!contentId) return res.status(400).json({ error: 'ID de contenido requerido' });

    console.log(`🗑️ [DELETE FAVORITE] Eliminando favorito con ID: ${contentId}`);

    // Obtener UUID del contenido
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
        console.error('❌ [DELETE FAVORITE] Contenido no encontrado');
        return res.status(404).json({ error: 'Contenido no encontrado' });
      }

      contenidoId = contentData.id_contenido;
    }

    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('id_usuario', userId)
      .eq('id_contenido', contenidoId);

    if (error) throw error;

    console.log('✅ [DELETE FAVORITE] Favorito eliminado correctamente');
    console.log(`⏱️ [DELETE FAVORITE] Tiempo total: ${Date.now() - startTime} ms`);
    res.json({ message: 'Favorito eliminado' });
  } catch (error: any) {
    console.error('💥 [DELETE FAVORITE] Error eliminando favorito:', error.message);
    res.status(500).json({ error: 'Error al eliminar favorito' });
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

    let contenidoId: string;

    if (isValidUUID(contentId)) {
      contenidoId = contentId;
    } else {
      const { data: contentData } = await supabase
        .from('Contenido')
        .select('id_contenido')
        .eq('id_externo', contentId.toString())
        .single();

      contenidoId = contentData?.id_contenido;
      if (!contenidoId) return res.json({ isFavorite: false });
    }

    const { data } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', contenidoId)
      .single();

    res.json({ isFavorite: !!data });
    console.log(`🔎 [CHECK FAVORITE] Resultado: ${!!data}`);
  } catch (error: any) {
    console.error('💥 [CHECK FAVORITE] Error verificando favorito:', error.message);
    res.status(500).json({ error: 'Error al verificar favorito' });
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

function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

console.log('✅ [FavoriteRoutes] Rutas de favoritos cargadas correctamente.');

export default router;
