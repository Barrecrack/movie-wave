"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthController_1 = __importDefault(require("../controllers/AuthController"));
const router = express_1.default.Router();
router.post('/register', (req, res) => AuthController_1.default.register(req, res));
router.post('/login', (req, res) => AuthController_1.default.login(req, res));
router.put('/update-user', (req, res) => AuthController_1.default.updateUser(req, res));
router.post('/forgot-password', (req, res) => AuthController_1.default.forgotPassword(req, res));
router.post('/reset-password', (req, res) => AuthController_1.default.resetPassword(req, res));
exports.default = router;
