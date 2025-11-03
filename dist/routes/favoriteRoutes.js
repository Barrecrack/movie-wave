"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const router = express_1.default.Router();
async function getUserIdFromAuth(token) {
    try {
        console.log('🔍 Buscando usuario autenticado...');
        const { data: { user }, error: authError } = await supabase_1.supabase.auth.getUser(token);
        if (authError || !user) {
            console.error('❌ Error obteniendo usuario de Auth:', authError?.message);
            return null;
        }
        console.log('✅ Usuario Auth encontrado:', user.id);
        return user.id;
    }
    catch (error) {
        console.error('❌ Error en getUserIdFromAuth:', error.message);
        return null;
    }
}
router.get('/my-favorites', async (req, res) => {
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
        const { data, error } = await supabase_1.supabase
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
    }
    catch (error) {
        console.error('❌ ERROR COMPLETO obteniendo favoritos:', error.message);
        res.status(500).json({
            error: 'Error al obtener favoritos',
            details: error.message
        });
    }
});
router.post('/', async (req, res) => {
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
        const { data: existing } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', userId)
            .eq('id_contenido', id_contenido)
            .single();
        if (existing) {
            console.log('⚠️ Ya existe en favoritos');
            return res.status(400).json({ error: 'Ya está en favoritos' });
        }
        const { data, error } = await supabase_1.supabase
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
    }
    catch (error) {
        console.error('❌ Error agregando favorito:', error.message);
        res.status(500).json({ error: 'Error al agregar favorito' });
    }
});
router.delete('/:contentId', async (req, res) => {
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
        const { error } = await supabase_1.supabase
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
    }
    catch (error) {
        console.error('❌ ERROR COMPLETO eliminando favorito:', error.message);
        res.status(500).json({
            error: 'Error al eliminar favorito',
            details: error.message
        });
    }
});
router.get('/check/:contentId', async (req, res) => {
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
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', userId)
            .eq('id_contenido', contentId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        res.json({ isFavorite: !!data });
    }
    catch (error) {
        console.error('❌ Error verificando favorito:', error.message);
        res.status(500).json({ error: 'Error al verificar favorito' });
    }
});
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
exports.default = router;
