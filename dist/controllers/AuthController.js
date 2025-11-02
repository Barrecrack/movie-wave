"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../config/supabase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailService_1 = require("../services/emailService");
class AuthController {
    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }
    async register(req, res) {
        console.log('🟢 [REGISTER] Solicitud recibida con body:', req.body);
        const { email, password, name, lastname, birthdate } = req.body;
        try {
            console.log('🔹 Registrando usuario en Supabase con role key...');
            const { data, error } = await supabase_1.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        lastname,
                        birthdate
                    }
                },
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
            res.json({
                user: data.user,
                session: data.session,
                token: data.session?.access_token,
                refresh_token: data.session?.refresh_token
            });
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
            const { name, lastname, email, password, birthdate } = req.body;
            console.log('🔹 Actualizando datos del usuario:', user.email);
            const { data, error } = await supabase_1.supabase.auth.updateUser({
                email: email || user.email,
                password: password || undefined,
                data: {
                    name: name || user.user_metadata?.name,
                    lastname: lastname || user.user_metadata?.lastname,
                    birthdate: birthdate || user.user_metadata?.birthdate,
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
    async deleteAccount(req, res) {
        console.log('🟢 [DELETE ACCOUNT] Solicitud de eliminación de cuenta recibida');
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }
        try {
            const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
            if (userError || !user) {
                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
            console.log('🔹 Desactivando cuenta del usuario:', user.email);
            const deletedEmail = `deleted_${Date.now()}@deleted.moviewave`;
            const randomPassword = Math.random().toString(36).slice(-16) + 'Aa1!';
            const { error: updateError } = await supabase_1.supabase.auth.admin.updateUserById(user.id, {
                email: deletedEmail,
                password: randomPassword,
                user_metadata: {
                    ...user.user_metadata,
                    account_deleted: true,
                    deleted_at: new Date().toISOString(),
                    original_email: user.email
                }
            });
            if (updateError) {
                console.error('❌ Error desactivando usuario:', updateError);
                throw updateError;
            }
            console.log('✅ Cuenta desactivada correctamente. Email original:', user.email);
            res.json({
                message: 'Cuenta eliminada permanentemente',
                original_email: user.email
            });
        }
        catch (error) {
            console.error('❌ Error en delete-account:', error.message);
            if (error.message.includes('updateUserById')) {
                res.status(500).json({
                    error: 'No se pudo eliminar la cuenta en este momento. Por favor, contacta al soporte.'
                });
            }
            else {
                res.status(500).json({ error: 'Error al eliminar la cuenta' });
            }
        }
    }
    async getUserProfile(req, res) {
        console.log('🟢 [GET USER PROFILE] Solicitud recibida');
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }
        try {
            const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
            if (error || !user) {
                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
            const birthdate = user.user_metadata?.birthdate;
            const age = birthdate ? this.calculateAge(birthdate) : null;
            res.json({
                name: user.user_metadata?.name || '',
                lastname: user.user_metadata?.lastname || '',
                email: user.email || '',
                birthdate: birthdate || '',
                age: age
            });
        }
        catch (error) {
            console.error('❌ Error obteniendo perfil:', error.message);
            res.status(500).json({ error: 'Error al obtener perfil' });
        }
    }
}
exports.default = new AuthController();
