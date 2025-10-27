"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const router = express_1.default.Router();
router.get('/:userId', async (req, res) => {
    console.log('🟢 [GET FAVORITES] Obteniendo favoritos para usuario:', req.params.userId);
    try {
        console.log('🔹 Ejecutando consulta SIMPLIFICADA...');
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
        }
        const { data: favoritos, error: favError } = await supabase_1.supabase
            .from('Favoritos')
            .select('*')
            .eq('id_usuario', userId);
        if (favError) {
            console.error('❌ Error obteniendo favoritos:', favError);
            throw favError;
        }
        console.log(`✅ ${favoritos?.length || 0} favoritos encontrados`);
        if (!favoritos || favoritos.length === 0) {
            return res.json([]);
        }
        const contenidoIds = favoritos.map(fav => fav.id_contenido);
        console.log('🔹 IDs de contenido a buscar:', contenidoIds);
        const { data: contenidos, error: contError } = await supabase_1.supabase
            .from('Contenido')
            .select('*')
            .in('id_contenido', contenidoIds);
        if (contError) {
            console.error('❌ Error obteniendo contenidos:', contError);
            throw contError;
        }
        console.log(`✅ ${contenidos?.length || 0} contenidos encontrados`);
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
    }
    catch (error) {
        console.error('❌ ERROR obteniendo favoritos:', error);
        res.status(500).json({
            error: 'Error al obtener favoritos',
            details: error.message
        });
    }
});
router.post('/', async (req, res) => {
    console.log('🟢 [ADD FAVORITE] Agregando favorito:', req.body);
    const { id_usuario, id_contenido } = req.body;
    try {
        const userId = parseInt(id_usuario);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
        }
        const { data: existing, error: checkError } = await supabase_1.supabase
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
        const { data, error } = await supabase_1.supabase
            .from('Favoritos')
            .insert([
            {
                id_usuario: userId,
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
    }
    catch (error) {
        console.error('❌ Error agregando favorito:', error.message);
        res.status(500).json({ error: 'Error al agregar favorito' });
    }
});
router.delete('/:userId/:contentId', async (req, res) => {
    console.log('🟢 [DELETE FAVORITE] Eliminando favorito:', req.params);
    try {
        console.log('🔹 Ejecutando DELETE en Supabase...');
        const userId = parseInt(req.params.userId);
        const contentId = parseInt(req.params.contentId);
        if (isNaN(userId) || isNaN(contentId)) {
            return res.status(400).json({ error: 'IDs inválidos' });
        }
        const { error } = await supabase_1.supabase
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
    }
    catch (error) {
        console.error('❌ ERROR eliminando favorito:', error);
        res.status(500).json({
            error: 'Error al eliminar favorito',
            details: error.message
        });
    }
});
exports.default = router;
