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
    normalizeUserData(body) {
        return {
            name: body.name,
            lastname: body.lastname,
            email: body.email,
            password: body.password,
            birthdate: body.birthdate,
        };
    }
    async waitForUsuarioCreation(userId, maxAttempts = 10) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Intento ${attempt}/${maxAttempts} - Buscando usuario en tabla Usuario...`);
            const { data: user, error } = await supabase_1.supabase
                .from('Usuario')
                .select('*')
                .eq('id_usuario', userId)
                .single();
            if (user) {
                console.log('✅ Usuario encontrado en tabla Usuario (creado por trigger)');
                return user;
            }
            if (error && error.code !== 'PGRST116') {
                console.error('❌ Error buscando usuario:', error.message);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.error(`❌ Usuario no apareció en tabla Usuario después de ${maxAttempts} intentos`);
        return null;
    }
    async register(req, res) {
        console.log('🟢 [REGISTER] Solicitud recibida:', req.body);
        const { name, lastname, email, password, birthdate } = req.body;
        try {
            if (!email || !password || !name || !lastname) {
                return res.status(400).json({
                    error: 'Email, password, name y lastname son requeridos'
                });
            }
            console.log('🔹 Registrando usuario en Supabase Auth...');
            const { data: authData, error: authError } = await supabase_1.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        nombre: name,
                        apellido: lastname,
                        edad: birthdate
                    }
                },
            });
            if (authError) {
                console.error('❌ Error en Auth:', authError.message);
                return res.status(400).json({ error: authError.message });
            }
            if (!authData.user) {
                return res.status(400).json({ error: 'No se pudo crear usuario en Auth' });
            }
            console.log('✅ Usuario registrado en Auth:', authData.user.email);
            const usuarioData = await this.waitForUsuarioCreation(authData.user.id);
            if (!usuarioData) {
                console.error('❌ No se pudo obtener usuario de tabla Usuario');
                return res.status(500).json({ error: 'Error al completar el registro' });
            }
            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                user: {
                    id: usuarioData.id_usuario,
                    name: usuarioData.nombre,
                    lastname: usuarioData.apellido,
                    email: usuarioData.correo,
                    birthdate: usuarioData.edad
                },
                session: authData.session,
                token: authData.session?.access_token
            });
        }
        catch (error) {
            console.error('❌ Error en registro:', error.message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    async login(req, res) {
        console.log('🟢 [LOGIN] Intento de inicio de sesión:', req.body);
        const { email, password } = req.body;
        try {
            if (!email || !password) {
                return res.status(400).json({ error: 'Email y password son requeridos' });
            }
            console.log('🔹 Autenticando usuario...');
            const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            if (error) {
                console.error('❌ Error de autenticación:', error.message);
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            const { data: usuarioData, error: usuarioError } = await supabase_1.supabase
                .from('Usuario')
                .select('*')
                .eq('id_usuario', data.user.id)
                .single();
            if (usuarioError) {
                console.error('❌ Error obteniendo datos de usuario:', usuarioError.message);
                return res.status(500).json({ error: 'Error al obtener datos del usuario' });
            }
            console.log('✅ Login exitoso para:', data.user.email);
            res.json({
                message: 'Login exitoso',
                user: {
                    id: usuarioData.id_usuario,
                    name: usuarioData.nombre,
                    lastname: usuarioData.apellido,
                    email: usuarioData.correo,
                    birthdate: usuarioData.edad
                },
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
            const { data: usuarioData, error: usuarioError } = await supabase_1.supabase
                .from('Usuario')
                .select('*')
                .eq('id_usuario', user.id)
                .single();
            if (usuarioError) {
                console.error('❌ Error obteniendo perfil:', usuarioError.message);
                return res.status(500).json({ error: 'Error al obtener perfil' });
            }
            const birthdate = usuarioData?.edad;
            const age = birthdate ? this.calculateAge(birthdate) : null;
            res.json({
                id: usuarioData.id_usuario,
                name: usuarioData.nombre || '',
                lastname: usuarioData.apellido || '',
                email: usuarioData.correo || '',
                birthdate: birthdate || '',
                age: age
            });
        }
        catch (error) {
            console.error('❌ Error obteniendo perfil:', error.message);
            res.status(500).json({ error: 'Error al obtener perfil' });
        }
    }
    async updateUser(req, res) {
        console.log('🟢 [UPDATE USER] Solicitud de actualización recibida.');
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }
        try {
            const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
            if (userError || !user) {
                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
            const { name, lastname, email, birthdate } = req.body;
            console.log('🔹 Actualizando datos del usuario:', user.email);
            const authUpdates = {};
            if (name !== undefined)
                authUpdates.data = { ...authUpdates.data, nombre: name };
            if (lastname !== undefined)
                authUpdates.data = { ...authUpdates.data, apellido: lastname };
            if (email !== undefined)
                authUpdates.email = email;
            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase_1.supabase.auth.updateUser(authUpdates);
                if (authError)
                    throw authError;
            }
            const userUpdates = {};
            if (name !== undefined)
                userUpdates.nombre = name;
            if (lastname !== undefined)
                userUpdates.apellido = lastname;
            if (email !== undefined)
                userUpdates.correo = email;
            if (birthdate !== undefined)
                userUpdates.edad = new Date(birthdate).toISOString().split('T')[0];
            if (Object.keys(userUpdates).length > 0) {
                const { data: userData, error: userUpdateError } = await supabase_1.supabase
                    .from('Usuario')
                    .update(userUpdates)
                    .eq('id_usuario', user.id)
                    .select()
                    .single();
                if (userUpdateError)
                    throw userUpdateError;
                console.log('✅ Usuario actualizado correctamente:', user.email);
                res.json({
                    message: 'Usuario actualizado exitosamente',
                    user: {
                        id: userData.id_usuario,
                        name: userData.nombre,
                        lastname: userData.apellido,
                        email: userData.correo,
                        birthdate: userData.edad
                    }
                });
            }
            else {
                res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
            }
        }
        catch (error) {
            console.error('❌ Error en update-user:', error.message);
            res.status(500).json({ error: 'Error al actualizar usuario' });
        }
    }
    async forgotPassword(req, res) {
        console.log('🟢 [FORGOT PASSWORD] Solicitud recibida para:', req.body);
        const normalizedData = this.normalizeUserData(req.body);
        const { email } = normalizedData;
        if (!email) {
            return res.status(400).json({ error: 'Correo/email es requerido' });
        }
        try {
            console.log('🔹 Generando token de recuperación...');
            const resetToken = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET || 'secret', {
                expiresIn: '1h',
            });
            console.log('🔹 Enviando correo de recuperación...');
            if (emailService_1.sendRecoveryEmail) {
                await (0, emailService_1.sendRecoveryEmail)(email, resetToken);
            }
            else {
                console.warn('⚠️ Servicio de email no disponible');
                console.log(`🔗 Token de recuperación: ${resetToken}`);
            }
            console.log('✅ Correo de recuperación enviado correctamente.');
            res.json({
                message: 'Correo de recuperación enviado',
                ...(process.env.NODE_ENV === 'development' && { token: resetToken })
            });
        }
        catch (error) {
            console.error('❌ Error en forgot-password:', error.message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    async resetPassword(req, res) {
        console.log('🟢 [RESET PASSWORD] Solicitud de reseteo recibida.');
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
        }
        try {
            console.log('🔹 Verificando token JWT...');
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            const correo = decoded.correo;
            console.log('📧 Email decodificado del token:', correo);
            const { data: userData, error: userError } = await supabase_1.supabase
                .from('Usuario')
                .select('id_usuario, correo')
                .eq('correo', correo)
                .maybeSingle();
            if (userError && userError.code !== 'PGRST116') {
                console.error('❌ Error buscando usuario:', userError.message);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            if (!userData) {
                console.warn('⚠️ Usuario no encontrado en la base de datos.');
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            console.log('🔹 Actualizando contraseña del usuario con ID:', userData.id_usuario);
            const { error: updateError } = await supabase_1.supabase.auth.updateUser({
                password: newPassword
            });
            if (updateError) {
                console.error('❌ Error actualizando contraseña:', updateError.message);
                throw updateError;
            }
            console.log('✅ Contraseña actualizada correctamente para:', correo);
            res.json({ message: 'Contraseña actualizada correctamente' });
        }
        catch (error) {
            console.error('❌ Error en reset-password:', error.message);
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(400).json({ error: 'Token inválido o expirado' });
            }
            res.status(500).json({ error: 'Error interno del servidor' });
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
            console.log('🔹 Eliminando usuario de tabla Usuario:', user.email);
            const { error: deleteError } = await supabase_1.supabase
                .from('Usuario')
                .delete()
                .eq('id_usuario', user.id);
            if (deleteError) {
                console.error('❌ Error eliminando usuario de tabla Usuario:', deleteError.message);
                return res.status(500).json({ error: 'Error eliminando cuenta' });
            }
            console.log('🔹 Desactivando cuenta en Auth...');
            const deletedEmail = `deleted_${Date.now()}@deleted.account`;
            const { error: authUpdateError } = await supabase_1.supabase.auth.updateUser({
                email: deletedEmail
            });
            if (authUpdateError) {
                console.warn('⚠️ No se pudo desactivar cuenta en Auth:', authUpdateError.message);
            }
            console.log('✅ Cuenta eliminada/desactivada:', user.email);
            res.json({
                message: 'Cuenta eliminada exitosamente',
                original_email: user.email
            });
        }
        catch (error) {
            console.error('❌ Error en delete-account:', error.message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}
exports.default = new AuthController();
