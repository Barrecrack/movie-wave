"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const router = express_1.default.Router();
router.get('/my-favorites', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    try {
        const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', user.id);
        console.log('🔹 Ejecutando consulta Supabase...');
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', user.id);
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
    }
    catch (error) {
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
router.post('/', async (req, res) => {
    console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    try {
        const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        const { id_contenido } = req.body;
        const id_usuario = user.id;
        const { data: existing } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', id_usuario)
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
                id_usuario: parseInt(id_usuario),
                id_contenido: parseInt(id_contenido),
                fecha_agregado: new Date().toISOString()
            }
        ])
            .select('*');
        if (error)
            throw error;
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
        const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.log('🟢 [DELETE FAVORITE] Eliminando favorito:', req.params);
        console.log('🔹 Ejecutando DELETE en Supabase...');
        const { error } = await supabase_1.supabase
            .from('Favoritos')
            .delete()
            .eq('id_usuario', user.id)
            .eq('id_contenido', req.params.contentId);
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
    }
    catch (error) {
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
router.get('/check/:contentId', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    try {
        const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.log('🟢 [CHECK FAVORITE] Verificando favorito:', req.params);
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', user.id)
            .eq('id_contenido', req.params.contentId)
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
exports.default = router;
