import express from 'express';
import AuthController from '../controllers/AuthController';

const router = express.Router();

// Rutas de autenticación
router.post('/register', (req, res) => AuthController.register(req, res));
router.post('/login', (req, res) => AuthController.login(req, res));
router.put('/update-user', (req, res) => AuthController.updateUser(req, res));
router.post('/forgot-password', (req, res) => AuthController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => AuthController.resetPassword(req, res));

export default router;