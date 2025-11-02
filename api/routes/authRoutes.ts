/**
 * @file authRoutes.js
 * @description Defines authentication-related routes such as register, login, update user,
 * password recovery, and user profile retrieval. Uses AuthController to handle business logic.
 */

import express from 'express';
import AuthController from '../controllers/AuthController';

console.log('🔹 Cargando rutas de autenticación...');

const router = express.Router();

/**
 * @route POST /register
 * @description Registers a new user in the system.
 * @access Public
 * 
 * @param {string} req.body.name - User's first name.
 * @param {string} req.body.lastname - User's last name.
 * @param {string} req.body.email - Unique user email.
 * @param {string} req.body.password - User's password.
 * 
 * @returns {Object} 201 - User successfully created.
 * @returns {Object} 400 - Validation error or user already exists.
 */
router.post('/register', (req, res) => {
  console.log('➡️ [POST] /register');
  AuthController.register(req, res);
});

/**
 * @route POST /login
 * @description Logs in a user and returns a JWT authentication token.
 * @access Public
 * 
 * @param {string} req.body.email - User's email address.
 * @param {string} req.body.password - User's password.
 * 
 * @returns {Object} 200 - JWT token and user information.
 * @returns {Object} 401 - Invalid credentials.
 */
router.post('/login', (req, res) => {
  console.log('➡️ [POST] /login');
  AuthController.login(req, res);
});

/**
 * @route PUT /update-user
 * @description Updates authenticated user's data.
 * @access Private
 * 
 * @param {string} [req.body.name] - Updated first name.
 * @param {string} [req.body.lastname] - Updated last name.
 * @param {string} [req.body.email] - Updated email.
 * 
 * @returns {Object} 200 - User successfully updated.
 * @returns {Object} 400 - Invalid data provided.
 * @returns {Object} 401 - Unauthorized access.
 */
router.put('/update-user', (req, res) => {
  console.log('➡️ [PUT] /update-user');
  AuthController.updateUser(req, res);
});

/**
 * @route DELETE /delete-account
 * @description Permanently deletes the authenticated user's account
 * @access Private
 * 
 * @returns {Object} 200 - Success message
 * @returns {Object} 401 - Unauthorized or invalid token
 * @returns {Object} 500 - Server error
 */
router.delete('/delete-account', (req, res) => {
  console.log('➡️ [DELETE] /delete-account');
  AuthController.deleteAccount(req, res);
});



/**
 * @route POST /forgot-password
 * @description Sends a password reset email with recovery instructions.
 * @access Public
 * 
 * @param {string} req.body.email - User's email to receive reset instructions.
 * 
 * @returns {Object} 200 - Password reset email sent.
 * @returns {Object} 404 - User not found.
 */
router.post('/forgot-password', (req, res) => {
  console.log('➡️ [POST] /forgot-password');
  AuthController.forgotPassword(req, res);
});

/**
 * @route POST /reset-password
 * @description Resets a user's password using a valid token.
 * @access Public
 * 
 * @param {string} req.body.token - Password reset token.
 * @param {string} req.body.newPassword - New password for the account.
 * 
 * @returns {Object} 200 - Password successfully updated.
 * @returns {Object} 400 - Invalid or expired token.
 */
router.post('/reset-password', (req, res) => {
  console.log('➡️ [POST] /reset-password');
  AuthController.resetPassword(req, res);
});

/**
 * @route GET /user-profile
 * @description Retrieves the profile information of the authenticated user.
 * @access Private
 * 
 * @returns {Object} 200 - Authenticated user's profile data.
 * @returns {Object} 401 - Unauthorized or invalid token.
 */
router.get('/user-profile', (req, res) => {
  console.log('➡️ [GET] /user-profile');
  AuthController.getUserProfile(req, res);
});

console.log('✅ Rutas de autenticación cargadas correctamente.');

export default router;
