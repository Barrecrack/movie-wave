"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthController_1 = __importDefault(require("../controllers/AuthController"));
console.log('🔹 Cargando rutas de autenticación...');
const router = express_1.default.Router();
router.post('/register', (req, res) => {
    console.log('➡️ [POST] /register');
    AuthController_1.default.register(req, res);
});
router.post('/login', (req, res) => {
    console.log('➡️ [POST] /login');
    AuthController_1.default.login(req, res);
});
router.put('/update-user', (req, res) => {
    console.log('➡️ [PUT] /update-user');
    AuthController_1.default.updateUser(req, res);
});
router.post('/forgot-password', (req, res) => {
    console.log('➡️ [POST] /forgot-password');
    AuthController_1.default.forgotPassword(req, res);
});
router.post('/reset-password', (req, res) => {
    console.log('➡️ [POST] /reset-password');
    AuthController_1.default.resetPassword(req, res);
});
router.get('/user-profile', (req, res) => {
    console.log('➡️ [GET] /user-profile');
    AuthController_1.default.getUserProfile(req, res);
});
console.log('✅ Rutas de autenticación cargadas correctamente.');
exports.default = router;
