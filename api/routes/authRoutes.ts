/** 
 * @file authRoutes.js
 * @description Defines authentication-related routes such as register, login, update user,
 * password recovery, and user profile retrieval. Uses AuthController to handle business logic.
 */

import express from 'express';
import AuthController from '../controllers/AuthController';

console.log('🚀 [AuthRoutes] Inicializando rutas de autenticación...');

const router = express.Router();

/**
 * @route POST /register
 * @description Registers a new user in the system.
 * @access Public
 */
router.post('/register', (req, res) => {
  console.log('➡️ [POST] /register | Datos recibidos:', req.body);
  AuthController.register(req, res)
    .then(() => console.log('✅ [POST] /register | Registro completado.'))
    .catch(err => console.error('❌ [POST] /register | Error en registro:', err.message));
});

/**
 * @route POST /login
 * @description Logs in a user and returns a JWT authentication token.
 * @access Public
 */
router.post('/login', (req, res) => {
  console.log('➡️ [POST] /login | Intento de inicio de sesión para:', req.body.email);
  AuthController.login(req, res)
    .then(() => console.log('✅ [POST] /login | Inicio de sesión exitoso.'))
    .catch(err => console.error('❌ [POST] /login | Error de autenticación:', err.message));
});

/**
 * @route PUT /update-user
 * @description Updates authenticated user's data.
 * @access Private
 */
router.put('/update-user', (req, res) => {
  console.log('➡️ [PUT] /update-user | Datos de actualización:', req.body);
  AuthController.updateUser(req, res)
    .then(() => console.log('✅ [PUT] /update-user | Usuario actualizado correctamente.'))
    .catch(err => console.error('❌ [PUT] /update-user | Error al actualizar usuario:', err.message));
});

/**
 * @route DELETE /delete-account
 * @description Permanently deletes the authenticated user's account.
 * @access Private
 */
router.delete('/delete-account', (req, res) => {
  console.log('➡️ [DELETE] /delete-account | Solicitud de eliminación de cuenta.');
  AuthController.deleteAccount(req, res)
    .then(() => console.log('✅ [DELETE] /delete-account | Cuenta eliminada correctamente.'))
    .catch(err => console.error('❌ [DELETE] /delete-account | Error al eliminar cuenta:', err.message));
});

/**
 * @route POST /forgot-password
 * @description Sends a password reset email with recovery instructions.
 * @access Public
 */
router.post('/forgot-password', (req, res) => {
  console.log('➡️ [POST] /forgot-password | Solicitud de recuperación para:', req.body.email);
  AuthController.forgotPassword(req, res)
    .then(() => console.log('✅ [POST] /forgot-password | Correo de recuperación enviado.'))
    .catch(err => console.error('❌ [POST] /forgot-password | Error al enviar correo:', err.message));
});

/**
 * @route POST /reset-password
 * @description Resets a user's password using a valid token.
 * @access Public
 */
router.post('/reset-password', (req, res) => {
  console.log('➡️ [POST] /reset-password | Token recibido:', req.body.token ? '✅' : '❌ Ninguno');
  AuthController.resetPassword(req, res)
    .then(() => console.log('✅ [POST] /reset-password | Contraseña restablecida.'))
    .catch(err => console.error('❌ [POST] /reset-password | Error al restablecer contraseña:', err.message));
});

/**
 * @route GET /user-profile
 * @description Retrieves the profile information of the authenticated user.
 * @access Private
 */
router.get('/user-profile', (req, res) => {
  console.log('➡️ [GET] /user-profile | Solicitando perfil de usuario autenticado...');
  AuthController.getUserProfile(req, res)
    .then(() => console.log('✅ [GET] /user-profile | Perfil de usuario obtenido.'))
    .catch(err => console.error('❌ [GET] /user-profile | Error al obtener perfil:', err.message));
});

console.log('✅ [AuthRoutes] Rutas de autenticación cargadas correctamente.');

export default router;
