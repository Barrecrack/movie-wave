import express from 'express';
import { supabase } from '../config/supabase';
import { Request, Response } from 'express';

const router = express.Router();

// 🔹 Obtener todos los favoritos del usuario con información del contenido
router.get('/:userId', async (req: Request, res: Response) => {
  console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', req.params.userId);
  
  try {
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

    if (error) throw error;
    
    console.log(`✅ ${data?.length || 0} favoritos encontrados`);
    res.json(data || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo favoritos:', error.message);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

// 🔹 Agregar a favoritos
router.post('/', async (req: Request, res: Response) => {
  console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
  const { id_usuario, id_contenido } = req.body;

  try {
    // Verificar si el contenido existe
    const { data: contenido, error: contenidoError } = await supabase
      .from('Contenido')
      .select('*')
      .eq('id_contenido', id_contenido)
      .single();

    if (contenidoError) {
      console.error('❌ Contenido no encontrado:', contenidoError);
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    // Verificar si ya existe en favoritos
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

    // Agregar a favoritos
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

// 🔹 Eliminar de favoritos
router.delete('/:userId/:contentId', async (req: Request, res: Response) => {
  console.log('🟢 [DELETE FAVORITE] Eliminando favorito:', req.params);
  
  try {
    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('id_usuario', req.params.userId)
      .eq('id_contenido', req.params.contentId);

    if (error) throw error;
    
    console.log('✅ Favorito eliminado correctamente');
    res.json({ message: 'Favorito eliminado' });
  } catch (error: any) {
    console.error('❌ Error eliminando favorito:', error.message);
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

// 🔹 Verificar si una película está en favoritos
router.get('/:userId/:contentId/check', async (req: Request, res: Response) => {
  console.log('🟢 [CHECK FAVORITE] Verificando favorito:', req.params);
  
  try {
    const { data, error } = await supabase
      .from('Favoritos')
      .select('*')
      .eq('id_usuario', req.params.userId)
      .eq('id_contenido', req.params.contentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no encontrado
    
    res.json({ isFavorite: !!data });
  } catch (error: any) {
    console.error('❌ Error verificando favorito:', error.message);
    res.status(500).json({ error: 'Error al verificar favorito' });
  }
});

export default router;