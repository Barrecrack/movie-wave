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
        const userIdNum = await getUserIdNumerico(user.id);
        if (!userIdNum) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        console.log('🔹 Ejecutando consulta Supabase...');
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', userIdNum);
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
        const userIdNum = await getUserIdNumerico(user.id);
        if (!userIdNum) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const { id_contenido } = req.body;
        const idContenidoNum = parseInt(id_contenido);
        if (isNaN(idContenidoNum)) {
            return res.status(400).json({ error: 'ID de contenido inválido' });
        }
        const { data: existing } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', userIdNum)
            .eq('id_contenido', idContenidoNum)
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
                id_usuario: userIdNum,
                id_contenido: idContenidoNum,
                fecha_agregado: new Date().toISOString().split('T')[0]
            }
        ])
            .select('*');
        if (error) {
            console.error('❌ ERROR SUPABASE DETALLADO (INSERT):', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
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
        const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        console.log('🟢 [DELETE FAVORITE] Eliminando favorito:', req.params);
        const userIdNum = await getUserIdNumerico(user.id);
        if (!userIdNum) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const contentIdNum = parseInt(req.params.contentId);
        if (isNaN(contentIdNum)) {
            return res.status(400).json({ error: 'ID de contenido inválido' });
        }
        console.log('🔹 Ejecutando DELETE en Supabase...');
        const { error } = await supabase_1.supabase
            .from('Favoritos')
            .delete()
            .eq('id_usuario', userIdNum)
            .eq('id_contenido', contentIdNum);
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
        const userIdNum = await getUserIdNumerico(user.id);
        if (!userIdNum) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const contentIdNum = parseInt(req.params.contentId);
        if (isNaN(contentIdNum)) {
            return res.status(400).json({ error: 'ID de contenido inválido' });
        }
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', userIdNum)
            .eq('id_contenido', contentIdNum)
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
async function getUserIdNumerico(authId) {
    try {
        const { data: { user }, error: authError } = await supabase_1.supabase.auth.getUser(authId);
        if (authError || !user?.email) {
            console.error('❌ Error obteniendo usuario de Auth:', authError);
            return null;
        }
        console.log('🔍 Buscando usuario por email:', user.email);
        const { data, error } = await supabase_1.supabase
            .from('usuario')
            .select('id_usuario')
            .eq('correo', user.email)
            .single();
        if (error) {
            console.error('❌ Error buscando usuario en BD:', error);
            return null;
        }
        if (!data) {
            console.error('❌ Usuario no encontrado en tabla usuario con email:', user.email);
            return null;
        }
        console.log(`✅ ID numérico encontrado: ${data.id_usuario}`);
        return data.id_usuario;
    }
    catch (error) {
        console.error('❌ Error en getUserIdNumerico:', error);
        return null;
    }
}
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
exports.default = router;
