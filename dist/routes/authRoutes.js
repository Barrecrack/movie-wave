"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthController_1 = __importDefault(require("../controllers/AuthController"));
console.log('🚀 [AuthRoutes] Inicializando rutas de autenticación...');
const router = express_1.default.Router();
router.post('/register', (req, res) => {
    console.log('➡️ [POST] /register | Datos recibidos:', req.body);
    AuthController_1.default.register(req, res)
        .then(() => console.log('✅ [POST] /register | Registro completado.'))
        .catch(err => console.error('❌ [POST] /register | Error en registro:', err.message));
});
router.post('/login', (req, res) => {
    console.log('➡️ [POST] /login | Intento de inicio de sesión para:', req.body.email);
    AuthController_1.default.login(req, res)
        .then(() => console.log('✅ [POST] /login | Inicio de sesión exitoso.'))
        .catch(err => console.error('❌ [POST] /login | Error de autenticación:', err.message));
});
router.put('/update-user', (req, res) => {
    console.log('➡️ [PUT] /update-user | Datos de actualización:', req.body);
    AuthController_1.default.updateUser(req, res)
        .then(() => console.log('✅ [PUT] /update-user | Usuario actualizado correctamente.'))
        .catch(err => console.error('❌ [PUT] /update-user | Error al actualizar usuario:', err.message));
});
router.delete('/delete-account', (req, res) => {
    console.log('➡️ [DELETE] /delete-account | Solicitud de eliminación de cuenta.');
    AuthController_1.default.deleteAccount(req, res)
        .then(() => console.log('✅ [DELETE] /delete-account | Cuenta eliminada correctamente.'))
        .catch(err => console.error('❌ [DELETE] /delete-account | Error al eliminar cuenta:', err.message));
});
router.post('/forgot-password', (req, res) => {
    console.log('➡️ [POST] /forgot-password | Solicitud de recuperación para:', req.body.email);
    AuthController_1.default.forgotPassword(req, res)
        .then(() => console.log('✅ [POST] /forgot-password | Correo de recuperación enviado.'))
        .catch(err => console.error('❌ [POST] /forgot-password | Error al enviar correo:', err.message));
});
router.post('/reset-password', (req, res) => {
    console.log('➡️ [POST] /reset-password | Token recibido:', req.body.token ? '✅' : '❌ Ninguno');
    AuthController_1.default.resetPassword(req, res)
        .then(() => console.log('✅ [POST] /reset-password | Contraseña restablecida.'))
        .catch(err => console.error('❌ [POST] /reset-password | Error al restablecer contraseña:', err.message));
});
router.get('/user-profile', (req, res) => {
    console.log('➡️ [GET] /user-profile | Solicitando perfil de usuario autenticado...');
    AuthController_1.default.getUserProfile(req, res)
        .then(() => console.log('✅ [GET] /user-profile | Perfil de usuario obtenido.'))
        .catch(err => console.error('❌ [GET] /user-profile | Error al obtener perfil:', err.message));
});
console.log('✅ [AuthRoutes] Rutas de autenticación cargadas correctamente.');
exports.default = router;
