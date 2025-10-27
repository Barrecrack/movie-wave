import express from 'express';
import AuthController from '../controllers/AuthController';

console.log('🔹 Cargando rutas de autenticación...');

const router = express.Router();

// Rutas de autenticación
router.post('/register', (req, res) => {
  console.log('➡️ [POST] /register');
  AuthController.register(req, res);
});

router.post('/login', (req, res) => {
  console.log('➡️ [POST] /login');
  AuthController.login(req, res);
});

router.put('/update-user', (req, res) => {
  console.log('➡️ [PUT] /update-user');
  AuthController.updateUser(req, res);
});

router.post('/forgot-password', (req, res) => {
  console.log('➡️ [POST] /forgot-password');
  AuthController.forgotPassword(req, res);
});

router.post('/reset-password', (req, res) => {
  console.log('➡️ [POST] /reset-password');
  AuthController.resetPassword(req, res);
});


router.get('/user-profile', (req, res) => {
  console.log('➡️ [GET] /user-profile');
  AuthController.getUserProfile(req, res);
});

console.log('✅ Rutas de autenticación cargadas correctamente.');

export default router;
