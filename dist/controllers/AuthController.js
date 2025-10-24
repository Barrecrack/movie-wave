"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../config/supabase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailService_1 = require("../services/emailService");
class AuthController {
    async register(req, res) {
        const { email, password, name, lastname } = req.body;
        try {
            const { data, error } = await supabase_1.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name, lastname },
                },
            });
            if (error)
                throw error;
            res.status(201).json({ user: data.user });
        }
        catch (error) {
            console.error('❌ Error en registro:', error.message);
            res.status(500).json({ error: 'Error al registrar usuario' });
        }
    }
    async login(req, res) {
        const { email, password } = req.body;
        try {
            const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error)
                throw error;
            res.json({ user: data.user, token: data.session?.access_token });
        }
        catch (error) {
            console.error('❌ Error en login:', error.message);
            res.status(500).json({ error: 'Error al iniciar sesión' });
        }
    }
    async updateUser(req, res) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }
        try {
            let { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
            if (userError || !user) {
                console.warn('⚠️ Token posiblemente expirado, intentando refrescar sesión...');
                const { data: refreshed, error: refreshError } = await supabase_1.supabase.auth.refreshSession();
                if (refreshError || !refreshed?.user) {
                    return res.status(401).json({ error: 'Token inválido o sesión expirada' });
                }
                user = refreshed.user;
            }
            const { name, lastname, email, password } = req.body;
            if (!process.env.SERVICE_ROLE_KEY) {
                console.warn('⚠️ SERVICE_ROLE_KEY no definida, usando auth.updateUser()');
                const { data, error } = await supabase_1.supabase.auth.updateUser({
                    email: email || user.email,
                    password: password || undefined,
                    data: {
                        name: name || user.user_metadata?.name,
                        lastname: lastname || user.user_metadata?.lastname,
                    },
                });
                if (error)
                    throw error;
                return res.json({ user: data.user });
            }
            const { error: updateError } = await supabase_1.supabase.auth.admin.updateUserById(user.id, {
                email,
                password: password || undefined,
                user_metadata: { name, lastname },
            });
            if (updateError)
                throw updateError;
            res.json({ message: 'Perfil actualizado correctamente' });
        }
        catch (error) {
            console.error('❌ Error en update-user:', error.message);
            res.status(500).json({ error: 'Error al actualizar usuario' });
        }
    }
    async forgotPassword(req, res) {
        const { email } = req.body;
        try {
            const resetToken = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
            await (0, emailService_1.sendRecoveryEmail)(email, resetToken);
            res.json({ message: 'Correo de recuperación enviado' });
        }
        catch (error) {
            console.error('❌ Error en forgot-password:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
    async resetPassword(req, res) {
        const { token, newPassword } = req.body;
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            const email = decoded.email;
            const { data: { users }, error: searchError } = await supabase_1.supabase.auth.admin.listUsers();
            if (searchError)
                throw searchError;
            const user = users.find((u) => u.email === email);
            if (!user)
                return res.status(404).json({ error: 'Usuario no encontrado' });
            const { error } = await supabase_1.supabase.auth.admin.updateUserById(user.id, {
                password: newPassword,
            });
            if (error)
                throw error;
            res.json({ message: 'Contraseña actualizada correctamente' });
        }
        catch (error) {
            console.error('❌ Error en reset-password:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}
exports.default = new AuthController();
