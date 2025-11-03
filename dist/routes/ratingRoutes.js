"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
console.log('🚀 [RatingRoutes] Inicializando rutas de calificaciones...');
const router = express_1.default.Router();
async function getUserIdFromAuth(token) {
    console.log('🔑 [AUTH] Verificando token del usuario...');
    try {
        const { data: { user }, error: authError } = await supabase_1.supabase.auth.getUser(token);
        if (authError || !user) {
            console.warn('⚠️ [AUTH] Token inválido o usuario no encontrado');
            return null;
        }
        return user.id;
    }
    catch (error) {
        console.error('💥 [AUTH] Error interno en getUserIdFromAuth:', error);
        return null;
    }
}
router.post('/', async (req, res) => {
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
        if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
            console.error('❌ [ADD RATING] Puntuación inválida');
            return res.status(400).json({ error: 'Puntuación debe ser entre 1 y 5' });
        }
        console.log(`🔹 [ADD RATING] ID de Pexels recibido: ${id_contenido}, Puntuación: ${puntuacion}`);
        const { data: contenidoExistente, error: contenidoError } = await supabase_1.supabase
            .from('Contenido')
            .select('id_contenido')
            .eq('id_externo', id_contenido.toString())
            .single();
        let contenidoId;
        if (contenidoExistente) {
            contenidoId = contenidoExistente.id_contenido;
            console.log(`✅ [ADD RATING] Contenido existente encontrado: ${contenidoId}`);
        }
        else {
            console.log('🆕 [ADD RATING] Creando nuevo contenido...');
            const newContentId = generateUUID();
            const { data: nuevoContenido, error: createError } = await supabase_1.supabase
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
        const { data: existingRating, error: checkError } = await supabase_1.supabase
            .from('Calificaciones')
            .select('*')
            .eq('id_usuario', userId)
            .eq('id_contenido', contenidoId)
            .single();
        let result;
        if (existingRating) {
            console.log('🔄 [ADD RATING] Actualizando calificación existente...');
            const { data, error } = await supabase_1.supabase
                .from('Calificaciones')
                .update({
                puntuacion: puntuacion,
                comentario: comentario || null,
                fecha: new Date().toISOString().split('T')[0]
            })
                .eq('id_calificacion', existingRating.id_calificacion)
                .select('*');
            if (error)
                throw error;
            result = data[0];
            console.log('✅ [ADD RATING] Calificación actualizada correctamente');
        }
        else {
            console.log('🆕 [ADD RATING] Creando nueva calificación...');
            const ratingData = {
                id_calificacion: generateUUID(),
                id_usuario: userId,
                id_contenido: contenidoId,
                puntuacion: puntuacion,
                comentario: comentario || null,
                fecha: new Date().toISOString().split('T')[0]
            };
            console.log('🔹 [ADD RATING] Insertando calificación:', ratingData);
            const { data, error } = await supabase_1.supabase
                .from('Calificaciones')
                .insert([ratingData])
                .select('*');
            if (error)
                throw error;
            result = data[0];
            console.log('✅ [ADD RATING] Calificación creada correctamente');
        }
        res.status(200).json({
            message: existingRating ? 'Calificación actualizada' : 'Calificación agregada',
            calificacion: result
        });
    }
    catch (error) {
        console.error('💥 [ADD RATING] Error procesando calificación:', error.message);
        res.status(500).json({ error: 'Error al procesar calificación' });
    }
});
router.get('/user/:contentId', async (req, res) => {
    console.log('➡️ [GET USER RATING] Verificando calificación del usuario:', req.params);
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Token requerido' });
    try {
        const userId = await getUserIdFromAuth(token);
        if (!userId)
            return res.status(401).json({ error: 'Token inválido' });
        const contentId = req.params.contentId;
        if (!contentId)
            return res.status(400).json({ error: 'ID de contenido requerido' });
        const { data: contenido } = await supabase_1.supabase
            .from('Contenido')
            .select('id_contenido')
            .eq('id_externo', contentId.toString())
            .single();
        if (!contenido)
            return res.json({ hasRating: false });
        const { data } = await supabase_1.supabase
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
    }
    catch (error) {
        console.error('💥 [GET USER RATING] Error verificando calificación:', error.message);
        res.status(500).json({ error: 'Error al verificar calificación' });
    }
});
router.get('/my-ratings', async (req, res) => {
    console.log('➡️ [GET MY RATINGS] Petición recibida para obtener calificaciones del usuario');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Token requerido' });
    try {
        const userId = await getUserIdFromAuth(token);
        if (!userId)
            return res.status(401).json({ error: 'Token inválido' });
        console.log(`🟢 [GET MY RATINGS] Consultando calificaciones del usuario: ${userId}`);
        const { data: calificaciones, error } = await supabase_1.supabase
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
        if (error)
            throw error;
        console.log(`✅ [GET MY RATINGS] ${calificaciones?.length || 0} calificaciones encontradas`);
        res.json(calificaciones || []);
    }
    catch (error) {
        console.error('💥 [GET MY RATINGS] Error al obtener calificaciones:', error.message);
        res.status(500).json({ error: 'Error al obtener calificaciones' });
    }
});
router.get('/content/:contentId', async (req, res) => {
    console.log('➡️ [GET CONTENT RATINGS] Petición recibida para calificaciones del contenido:', req.params);
    try {
        const contentId = req.params.contentId;
        if (!contentId)
            return res.status(400).json({ error: 'ID de contenido requerido' });
        const { data: contenido } = await supabase_1.supabase
            .from('Contenido')
            .select('id_contenido')
            .eq('id_externo', contentId.toString())
            .single();
        if (!contenido)
            return res.json([]);
        const { data: calificaciones, error } = await supabase_1.supabase
            .from('Calificaciones')
            .select(`
        *,
        User:auth.users(email)
      `)
            .eq('id_contenido', contenido.id_contenido);
        if (error)
            throw error;
        console.log(`✅ [GET CONTENT RATINGS] ${calificaciones?.length || 0} calificaciones encontradas`);
        res.json(calificaciones || []);
    }
    catch (error) {
        console.error('💥 [GET CONTENT RATINGS] Error al obtener calificaciones:', error.message);
        res.status(500).json({ error: 'Error al obtener calificaciones del contenido' });
    }
});
router.delete('/:contentId', async (req, res) => {
    console.log('➡️ [DELETE RATING] Petición recibida:', req.params);
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Token requerido' });
    try {
        const userId = await getUserIdFromAuth(token);
        if (!userId)
            return res.status(401).json({ error: 'Token inválido' });
        const contentId = req.params.contentId;
        if (!contentId)
            return res.status(400).json({ error: 'ID de contenido requerido' });
        console.log(`🗑️ [DELETE RATING] Eliminando calificación con ID Pexels: ${contentId}`);
        const { data: contenido, error: contenidoError } = await supabase_1.supabase
            .from('Contenido')
            .select('id_contenido')
            .eq('id_externo', contentId.toString())
            .single();
        if (contenidoError || !contenido) {
            console.error('❌ [DELETE RATING] Contenido no encontrado');
            return res.status(404).json({ error: 'Contenido no encontrado' });
        }
        const { error } = await supabase_1.supabase
            .from('Calificaciones')
            .delete()
            .eq('id_usuario', userId)
            .eq('id_contenido', contenido.id_contenido);
        if (error)
            throw error;
        console.log('✅ [DELETE RATING] Calificación eliminada correctamente');
        res.json({ message: 'Calificación eliminada' });
    }
    catch (error) {
        console.error('💥 [DELETE RATING] Error eliminando calificación:', error.message);
        res.status(500).json({ error: 'Error al eliminar calificación' });
    }
});
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
console.log('✅ [RatingRoutes] Rutas de calificaciones cargadas correctamente.');
exports.default = router;
