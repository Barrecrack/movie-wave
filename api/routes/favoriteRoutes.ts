import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

const router = express.Router();

// 🔹 Obtener todos los favoritos del usuario - VERSIÓN CORREGIDA
router.get('/:userId', async (req: Request, res: Response) => {
  console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', req.params.userId);

  try {
    console.log('🔹 Ejecutando consulta SIMPLIFICADA...');

    // Convertir userId a número (ya que tu tabla usa numeric)
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Primero: obtener solo los favoritos básicos
    const { data: favoritos, error: favError } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId);

    if (favError) {
      console.error('❌ Error obteniendo favoritos:', favError);
      throw favError;
    }

    console.log(`✅ ${favoritos?.length || 0} favoritos encontrados`);

    // Si no hay favoritos, devolver array vacío
    if (!favoritos || favoritos.length === 0) {
      return res.json([]);
    }

    // Obtener los IDs de contenido
    const contenidoIds = favoritos.map(fav => fav.id_contenido);

    console.log('🔹 IDs de contenido a buscar:', contenidoIds);

    // Obtener los detalles del contenido
    const { data: contenidos, error: contError } = await supabase
      .from('Contenido')
      .select('*')
      .in('id_contenido', contenidoIds);

    if (contError) {
      console.error('❌ Error obteniendo contenidos:', contError);
      throw contError;
    }

    console.log(`✅ ${contenidos?.length || 0} contenidos encontrados`);

    // Combinar los datos manualmente
    const resultado = favoritos.map(fav => {
      const contenido = contenidos?.find(cont => cont.id_contenido === fav.id_contenido);
      return {
        id_usuario: fav.id_usuario,
        id_contenido: fav.id_contenido,
        fecha_agregado: fav.fecha_agregado,
        Contenido: contenido ? {
          id_contenido: contenido.id_contenido,
          titulo: contenido.titulo,
          poster: contenido.poster,
          genero: contenido.genero,
          año: contenido.año,
          descripcion: contenido.descripcion,
          duracion: contenido.duracion,
          video_url: contenido.video_url
        } : null
      };
    });

    console.log('✅ Datos combinados correctamente');
    res.json(resultado);

  } catch (error: any) {
    console.error('❌ ERROR obteniendo favoritos:', error);
    res.status(500).json({
      error: 'Error al obtener favoritos',
      details: error.message
    });
  }
});

// 🔹 Agregar a favoritos - VERSIÓN CORREGIDA
router.post('/', async (req: Request, res: Response) => {
  console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
  const { id_usuario, id_contenido } = req.body;

  try {
    // Convertir id_usuario a número (ya que tu tabla usa numeric)
    const userId = parseInt(id_usuario);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Verificar si ya existe en favoritos
    const { data: existing, error: checkError } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_contenido', id_contenido)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando favorito existente:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log('⚠️ Ya existe en favoritos');
      return res.status(400).json({ error: 'Ya está en favoritos' });
    }

    // Agregar a favoritos
    const { data, error } = await supabase
      .from('Favoritos')
      .insert([
        {
          id_usuario: userId, // Usar el número convertido
          id_contenido: id_contenido,
          fecha_agregado: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error agregando favorito:', error);
      throw error;
    }

    console.log('✅ Favorito agregado correctamente');
    res.status(201).json(data[0]);
  } catch (error: any) {
    console.error('❌ Error agregando favorito:', error.message);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

// 🔹 Eliminar de favoritos - VERSIÓN CORREGIDA
router.delete('/:userId/:contentId', async (req: Request, res: Response) => {
  console.log('🟢 [DELETE FAVORITE] Eliminando favorito:', req.params);

  try {
    console.log('🔹 Ejecutando DELETE en Supabase...');

    // Convertir userId a número y contentId a número
    const userId = parseInt(req.params.userId);
    const contentId = parseInt(req.params.contentId);

    if (isNaN(userId) || isNaN(contentId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('id_usuario', userId)
      .eq('id_contenido', contentId);

    if (error) {
      console.error('❌ Error eliminando favorito:', error);
      throw error;
    }

    console.log('✅ Favorito eliminado correctamente');
    res.json({ message: 'Favorito eliminado' });
  } catch (error: any) {
    console.error('❌ ERROR eliminando favorito:', error);
    res.status(500).json({
      error: 'Error al eliminar favorito',
      details: error.message
    });
  }
});

export default router;