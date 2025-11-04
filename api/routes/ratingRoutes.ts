import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

console.log('🚀 [RatingRoutes] Inicializando rutas de calificaciones...');

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
/* 🔸 RUTA: Agregar/Actualizar calificación         */
/* ──────────────────────────────────────────────── */
router.post('/', async (req: Request, res: Response) => {
  console.log('➡️ [ADD RATING] Petición para agregar calificación:', req.body);

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.error('❌ [ADD RATING] Token no proporcionado');
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const userId = await getUserIdFromAuth(token);
    console.log(`🔹 [ADD RATING] User ID obtenido: ${userId}`);
    
    if (!userId) {
      console.error('❌ [ADD RATING] No se pudo obtener user ID del token');
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { id_contenido, puntuacion, comentario } = req.body;
    
    if (!id_contenido) {
      console.error('❌ [ADD RATING] ID de contenido no proporcionado');
      return res.status(400).json({ error: 'ID de contenido requerido' });
    }

    // 🔥 VALIDACIÓN MODIFICADA: Permitir calificación parcial
    if (puntuacion === undefined && comentario === undefined) {
      console.error('❌ [ADD RATING] Se requiere al menos puntuación o comentario');
      return res.status(400).json({ error: 'Se requiere al menos puntuación o comentario' });
    }

    // 🔥 VALIDAR PUNTUACIÓN SI SE PROPORCIONA
    if (puntuacion !== undefined && (puntuacion < 1 || puntuacion > 5)) {
      console.error('❌ [ADD RATING] Puntuación inválida');
      return res.status(400).json({ error: 'Puntuación debe ser entre 1 y 5' });
    }

    console.log(`🔹 [ADD RATING] ID de Pexels recibido: ${id_contenido}, Puntuación: ${puntuacion}, Comentario: ${comentario ? 'Sí' : 'No'}`);

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
      console.log(`✅ [ADD RATING] Contenido existente encontrado: ${contenidoId}`);
    } else {
      // Si no existe, crear uno nuevo
      console.log('🆕 [ADD RATING] Creando nuevo contenido...');
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
        console.error('❌ [ADD RATING] Error creando contenido:', createError);
        return res.status(400).json({ error: 'Error al procesar el contenido' });
      }

      contenidoId = nuevoContenido.id_contenido;
      console.log(`✅ [ADD RATING] Nuevo contenido creado: ${contenidoId}`);
    }

    // 🔥 VERIFICAR SI YA EXISTE UNA CALIFICACIÓN DEL USUARIO PARA ESTE CONTENIDO
    const { data: existingRating, error: checkError } = await supabase
      .from('Calificaciones')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', contenidoId)
      .single();

    let result;
    
    if (existingRating) {
      // 🔥 ACTUALIZAR CALIFICACIÓN EXISTENTE - ACTUALIZAR SOLO LOS CAMPOS PROPORCIONADOS
      console.log('🔄 [ADD RATING] Actualizando calificación existente...');
      
      const updateData: any = {
        fecha: new Date().toISOString().split('T')[0]
      };

      // 🔥 ACTUALIZAR SOLO SI SE PROPORCIONA EL VALOR
      if (puntuacion !== undefined) {
        updateData.puntuacion = puntuacion;
      }
      if (comentario !== undefined) {
        updateData.comentario = comentario && comentario.trim() !== "" ? comentario : null;
      }

      console.log('🔹 [ADD RATING] Datos a actualizar:', updateData);

      const { data, error } = await supabase
        .from('Calificaciones')
        .update(updateData)
        .eq('id_calificacion', existingRating.id_calificacion)
        .select('*');

      if (error) {
        console.error('❌ [ADD RATING] Error actualizando calificación:', error);
        throw error;
      }
      result = data[0];
      console.log('✅ [ADD RATING] Calificación actualizada correctamente');
    } else {
      // 🔥 CREAR NUEVA CALIFICACIÓN - PERMITIR VALORES PARCIALES
      console.log('🆕 [ADD RATING] Creando nueva calificación...');
      
      // 🔥 VALIDAR QUE AL MENOS UNO TENGA VALOR
      if (puntuacion === undefined && comentario === undefined) {
        return res.status(400).json({ error: 'Se requiere al menos puntuación o comentario para crear una nueva calificación' });
      }

      const ratingData = {
        id_calificacion: generateUUID(),
        id_usuario: userId,
        id_contenido: contenidoId,
        puntuacion: puntuacion !== undefined ? puntuacion : null, // 🔥 Permitir null
        comentario: comentario !== undefined && comentario.trim() !== "" ? comentario : null, // 🔥 Permitir null
        fecha: new Date().toISOString().split('T')[0]
      };

      console.log('🔹 [ADD RATING] Insertando calificación:', ratingData);

      const { data, error } = await supabase
        .from('Calificaciones')
        .insert([ratingData])
        .select('*');

      if (error) {
        console.error('❌ [ADD RATING] Error insertando calificación:', error);
        throw error;
      }
      result = data[0];
      console.log('✅ [ADD RATING] Calificación creada correctamente');
    }

    res.status(200).json({ 
      message: existingRating ? 'Calificación actualizada' : 'Calificación agregada',
      calificacion: result
    });
  } catch (error: any) {
    console.error('💥 [ADD RATING] Error procesando calificación:', error.message);
    res.status(500).json({ error: 'Error al procesar calificación' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Obtener calificación del usuario        */
/* ──────────────────────────────────────────────── */
router.get('/user/:contentId', async (req: Request, res: Response) => {
  console.log('➡️ [GET USER RATING] Verificando calificación del usuario:', req.params);

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

    if (!contenido) return res.json({ hasRating: false });

    // VERIFICAR SI TIENE CALIFICACIÓN
    const { data } = await supabase
      .from('Calificaciones')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', contenido.id_contenido)
      .single();

    res.json({ 
      hasRating: !!data,
      calificacion: data || null
    });
    console.log(`🔎 [GET USER RATING] Resultado: ${!!data}`);
  } catch (error: any) {
    console.error('💥 [GET USER RATING] Error verificando calificación:', error.message);
    res.status(500).json({ error: 'Error al verificar calificación' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Obtener calificaciones del usuario      */
/* ──────────────────────────────────────────────── */
router.get('/my-ratings', async (req: Request, res: Response) => {
  console.log('➡️ [GET MY RATINGS] Petición recibida para obtener calificaciones del usuario');

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    console.log(`🟢 [GET MY RATINGS] Consultando calificaciones del usuario: ${userId}`);

    // 🔥 OBTENER CALIFICACIONES CON INFORMACIÓN DEL CONTENIDO
    const { data: calificaciones, error } = await supabase
      .from('Calificaciones')
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

    console.log(`✅ [GET MY RATINGS] ${calificaciones?.length || 0} calificaciones encontradas`);
    res.json(calificaciones || []);
  } catch (error: any) {
    console.error('💥 [GET MY RATINGS] Error al obtener calificaciones:', error.message);
    res.status(500).json({ error: 'Error al obtener calificaciones' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Obtener calificaciones de un contenido  */
/* ──────────────────────────────────────────────── */
router.get('/content/:contentId', async (req: Request, res: Response) => {
  console.log('➡️ [GET CONTENT RATINGS] Petición recibida para calificaciones del contenido:', req.params);

  try {
    const contentId = req.params.contentId;
    if (!contentId) return res.status(400).json({ error: 'ID de contenido requerido' });

    // 🔥 BUSCAR POR id_externo EN CONTENIDO
    const { data: contenido } = await supabase
      .from('Contenido')
      .select('id_contenido')
      .eq('id_externo', contentId.toString())
      .single();

    if (!contenido) return res.json([]);

    // OBTENER TODAS LAS CALIFICACIONES DEL CONTENIDO
    const { data: calificaciones, error } = await supabase
      .from('Calificaciones')
      .select(`
        *,
        User:auth.users(email)
      `)
      .eq('id_contenido', contenido.id_contenido);

    if (error) throw error;

    console.log(`✅ [GET CONTENT RATINGS] ${calificaciones?.length || 0} calificaciones encontradas`);
    res.json(calificaciones || []);
  } catch (error: any) {
    console.error('💥 [GET CONTENT RATINGS] Error al obtener calificaciones:', error.message);
    res.status(500).json({ error: 'Error al obtener calificaciones del contenido' });
  }
});

/* ──────────────────────────────────────────────── */
/* 🔸 RUTA: Eliminar calificación                   */
/* ──────────────────────────────────────────────── */
router.delete('/:contentId', async (req: Request, res: Response) => {
  console.log('➡️ [DELETE RATING] Petición recibida:', req.params);

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const userId = await getUserIdFromAuth(token);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const contentId = req.params.contentId;
    if (!contentId) return res.status(400).json({ error: 'ID de contenido requerido' });

    console.log(`🗑️ [DELETE RATING] Eliminando calificación con ID Pexels: ${contentId}`);

    // 🔥 BUSCAR CONTENIDO POR id_externo
    const { data: contenido, error: contenidoError } = await supabase
      .from('Contenido')
      .select('id_contenido')
      .eq('id_externo', contentId.toString())
      .single();

    if (contenidoError || !contenido) {
      console.error('❌ [DELETE RATING] Contenido no encontrado');
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    // ELIMINAR CALIFICACIÓN
    const { error } = await supabase
      .from('Calificaciones')
      .delete()
      .eq('id_usuario', userId)
      .eq('id_contenido', contenido.id_contenido);

    if (error) throw error;

    console.log('✅ [DELETE RATING] Calificación eliminada correctamente');
    res.json({ message: 'Calificación eliminada' });
  } catch (error: any) {
    console.error('💥 [DELETE RATING] Error eliminando calificación:', error.message);
    res.status(500).json({ error: 'Error al eliminar calificación' });
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

console.log('✅ [RatingRoutes] Rutas de calificaciones cargadas correctamente.');

export default router;