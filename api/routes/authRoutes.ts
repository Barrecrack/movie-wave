/**
 * @file authRoutes.js
 * @description Defines authentication-related routes such as register, login, update user,
 * password recovery, and user profile retrieval. Uses AuthController to handle business logic.
 * @module routes/authRoutes
 */

import express from 'express';
import AuthController from '../controllers/AuthController';

console.log('🚀 [AuthRoutes] Inicializando rutas de autenticación...');

const router = express.Router();

/**
 * Registers a new user in the system.
 *
 * @route POST /register
 * @group Authentication
 * @param {Object} req.body - User registration data (name, email, password, etc.)
 * @returns {Promise<void>} Success or error response from controller
 * @access Public
 */
router.post('/register', (req, res) => {
  console.log('➡️ [POST] /register | Datos recibidos:', req.body);
  AuthController.register(req, res)
    .then(() => console.log('✅ [POST] /register | Registro completado.'))
    .catch(err => console.error('❌ [POST] /register | Error en registro:', err.message));
});

/**
 * Logs in a user and returns a JWT authentication token.
 *
 * @route POST /login
 * @group Authentication
 * @param {Object} req.body - Login credentials (email, password)
 * @returns {Promise<void>} Authenticated session token
 * @access Public
 */
router.post('/login', (req, res) => {
  console.log('➡️ [POST] /login | Intento de inicio de sesión para:', req.body.email);
  AuthController.login(req, res)
    .then(() => console.log('✅ [POST] /login | Inicio de sesión exitoso.'))
    .catch(err => console.error('❌ [POST] /login | Error de autenticación:', err.message));
});

/**
 * Updates authenticated user's data.
 *
 * @route PUT /update-user
 * @group Authentication
 * @param {Object} req.body - Updated user fields
 * @returns {Promise<void>} Confirmation of user data update
 * @access Private
 */
router.put('/update-user', (req, res) => {
  console.log('➡️ [PUT] /update-user | Datos de actualización:', req.body);
  AuthController.updateUser(req, res)
    .then(() => console.log('✅ [PUT] /update-user | Usuario actualizado correctamente.'))
    .catch(err => console.error('❌ [PUT] /update-user | Error al actualizar usuario:', err.message));
});

/**
 * Permanently deletes the authenticated user's account.
 *
 * @route DELETE /delete-account
 * @group Authentication
 * @returns {Promise<void>} Confirmation of account deletion
 * @access Private
 */
router.delete('/delete-account', (req, res) => {
  console.log('➡️ [DELETE] /delete-account | Solicitud de eliminación de cuenta.');
  AuthController.deleteAccount(req, res)
    .then(() => console.log('✅ [DELETE] /delete-account | Cuenta eliminada correctamente.'))
    .catch(err => console.error('❌ [DELETE] /delete-account | Error al eliminar cuenta:', err.message));
});

/**
 * Sends a password reset email with recovery instructions.
 *
 * @route POST /forgot-password
 * @group Authentication
 * @param {string} req.body.email - Email address of the user requesting recovery
 * @returns {Promise<void>} Email sent confirmation
 * @access Public
 */
router.post('/forgot-password', (req, res) => {
  console.log('➡️ [POST] /forgot-password | Solicitud de recuperación para:', req.body.email);
  AuthController.forgotPassword(req, res)
    .then(() => console.log('✅ [POST] /forgot-password | Correo de recuperación enviado.'))
    .catch(err => console.error('❌ [POST] /forgot-password | Error al enviar correo:', err.message));
});

/**
 * Resets a user's password using a valid token.
 *
 * @route POST /reset-password
 * @group Authentication
 * @param {string} req.body.token - Password reset token
 * @param {string} req.body.newPassword - New password for the account
 * @returns {Promise<void>} Password reset confirmation
 * @access Public
 */
router.post('/reset-password', (req, res) => {
  console.log('➡️ [POST] /reset-password | Token recibido:', req.body.token ? '✅' : '❌ Ninguno');
  AuthController.resetPassword(req, res)
    .then(() => console.log('✅ [POST] /reset-password | Contraseña restablecida.'))
    .catch(err => console.error('❌ [POST] /reset-password | Error al restablecer contraseña:', err.message));
});

/**
 * Retrieves the profile information of the authenticated user.
 *
 * @route GET /user-profile
 * @group Authentication
 * @returns {Promise<void>} Authenticated user profile data
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
