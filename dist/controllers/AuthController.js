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
        console.log('🟢 [REGISTER] Solicitud recibida con body:', req.body);
        const { email, password, name, lastname } = req.body;
        try {
            console.log('🔹 Registrando usuario en Supabase con role key...');
            const { data, error } = await supabase_1.supabase.auth.signUp({
                email,
                password,
                options: { data: { name, lastname } },
            });
            if (error)
                throw error;
            console.log('✅ Usuario registrado correctamente:', data.user?.email);
            res.status(201).json({ user: data.user });
        }
        catch (error) {
            console.error('❌ Error en registro:', error.message);
            res.status(500).json({ error: 'Error al registrar usuario' });
        }
    }
    async login(req, res) {
        console.log('🟢 [LOGIN] Intento de inicio de sesión con email:', req.body.email);
        const { email, password } = req.body;
        try {
            console.log('🔹 Autenticando usuario con role key...');
            const { data, error } = await supabase_1.supabase.auth.signInWithPassword({ email, password });
            if (error)
                throw error;
            console.log('✅ Login exitoso para:', data.user?.email);
            res.json({ user: data.user, token: data.session?.access_token });
        }
        catch (error) {
            console.error('❌ Error en login:', error.message);
            res.status(500).json({ error: 'Error al iniciar sesión' });
        }
    }
    async updateUser(req, res) {
        console.log('🟢 [UPDATE USER] Solicitud de actualización recibida.');
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            console.warn('⚠️ Token no proporcionado en cabecera Authorization.');
            return res.status(401).json({ error: 'Token requerido' });
        }
        try {
            console.log('🔹 Obteniendo usuario desde el token...');
            const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
            if (userError || !user) {
                console.error('❌ No se pudo obtener usuario con el token.');
                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
            const { name, lastname, email, password } = req.body;
            console.log('🔹 Actualizando datos del usuario:', user.email);
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
            console.log('✅ Usuario actualizado correctamente:', data.user?.email);
            res.json({ user: data.user });
        }
        catch (error) {
            console.error('❌ Error en update-user:', error.message);
            res.status(500).json({ error: 'Error al actualizar usuario' });
        }
    }
    async forgotPassword(req, res) {
        console.log('🟢 [FORGOT PASSWORD] Solicitud recibida para:', req.body.email);
        const { email } = req.body;
        try {
            console.log('🔹 Generando token de recuperación...');
            const resetToken = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET || 'secret', {
                expiresIn: '1h',
            });
            console.log('🔹 Enviando correo de recuperación...');
            await (0, emailService_1.sendRecoveryEmail)(email, resetToken);
            console.log('✅ Correo de recuperación enviado correctamente.');
            res.json({ message: 'Correo de recuperación enviado' });
        }
        catch (error) {
            console.error('❌ Error en forgot-password:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
    async resetPassword(req, res) {
        console.log('🟢 [RESET PASSWORD] Solicitud de reseteo recibida.');
        const { token, newPassword } = req.body;
        console.log('📦 Body recibido:', req.body);
        try {
            console.log('🔹 Verificando token JWT...');
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            const email = decoded.email;
            console.log('📧 Email decodificado del token:', email);
            console.log('🔹 Obteniendo lista de usuarios...');
            const { data: usersData, error: listError } = await supabase_1.supabase.auth.admin.listUsers();
            if (listError)
                throw listError;
            console.log(`📋 ${usersData.users.length} usuarios obtenidos.`);
            const user = usersData.users.find((u) => u.email === email);
            if (!user) {
                console.warn('⚠️ Usuario no encontrado en Supabase.');
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            console.log('🔹 Actualizando contraseña del usuario con ID:', user.id);
            const { error } = await supabase_1.supabase.auth.admin.updateUserById(user.id, {
                password: newPassword,
            });
            if (error)
                throw error;
            console.log('✅ Contraseña actualizada correctamente para:', user.email);
            res.json({ message: 'Contraseña actualizada correctamente' });
        }
        catch (error) {
            console.error('❌ Error en reset-password:', error.message);
            console.error('📛 Stack:', error.stack);
            res.status(500).json({ error: error.message });
        }
    }
}
exports.default = new AuthController();
