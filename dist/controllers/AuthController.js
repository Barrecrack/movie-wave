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
        console.log(`🕒 [waitForUsuarioCreation] Esperando creación de usuario con ID ${userId}...`);
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Intento ${attempt}/${maxAttempts}: verificando existencia en tabla Usuario...`);
            const { data: user, error } = await supabase_1.supabase
                .from('Usuario')
                .select('*')
                .eq('id_usuario', userId)
                .single();
            if (user) {
                console.log('✅ Usuario encontrado en tabla Usuario (trigger completado)');
                return user;
            }
            if (error && error.code !== 'PGRST116') {
                console.error(`❌ Error al consultar Usuario (intento ${attempt}):`, error.message);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.error(`🚨 Usuario con ID ${userId} no apareció después de ${maxAttempts} intentos`);
        return null;
    }
    async register(req, res) {
        console.log('🟢 [REGISTER] Solicitud recibida con datos:', req.body);
        const { name, lastname, email, password, birthdate } = req.body;
        try {
            if (!email || !password || !name || !lastname || !birthdate) {
                console.warn('⚠️ [REGISTER] Datos incompletos recibidos');
                return res.status(400).json({ error: 'Todos los campos son requeridos' });
            }
            console.log('🔹 [REGISTER] Creando usuario en Supabase Auth...');
            const { data: authData, error: authError } = await supabase_1.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nombre: name,
                        apellido: lastname,
                        edad: birthdate
                    }
                },
            });
            if (authError) {
                console.error('❌ [REGISTER] Error en Supabase Auth:', authError.message);
                return res.status(400).json({ error: authError.message });
            }
            if (!authData.user) {
                console.error('❌ [REGISTER] No se recibió objeto user de Supabase');
                return res.status(400).json({ error: 'No se pudo crear usuario en Auth' });
            }
            console.log(`✅ [REGISTER] Usuario ${authData.user.email} registrado en Auth`);
            try {
                const { error: usuarioError } = await supabase_1.supabase
                    .from('Usuario')
                    .insert([{
                        id_usuario: authData.user.id,
                        nombre: name,
                        apellido: lastname,
                        correo: email,
                        edad: birthdate,
                        contrasena: password
                    }]);
                if (usuarioError) {
                    console.warn('⚠️ [REGISTER] Error creando usuario manual:', usuarioError.message);
                }
            }
            catch (manualError) {
                console.warn('⚠️ [REGISTER] Error en creación manual:', manualError);
            }
            console.log('✅ [REGISTER] Registro completado correctamente');
            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                user: {
                    id: authData.user.id,
                    name: name,
                    lastname: lastname,
                    email: email,
                    birthdate: birthdate
                },
                session: authData.session,
                token: authData.session?.access_token
            });
        }
        catch (error) {
            console.error('💥 [REGISTER] Error inesperado:', error.message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    async login(req, res) {
        console.log('🟢 [LOGIN] Intento de inicio de sesión:', req.body);
        const { email, password } = req.body;
        try {
            if (!email || !password) {
                console.warn('⚠️ [LOGIN] Falta email o password');
                return res.status(400).json({ error: 'Email y password son requeridos' });
            }
            console.log('🔹 [LOGIN] Autenticando usuario...');
            const { data, error } = await supabase_1.supabase.auth.signInWithPassword({ email, password });
            if (error || !data.user) {
                console.error('❌ [LOGIN] Error de autenticación:', error?.message);
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            console.log(`🔹 [LOGIN] Consultando datos en tabla Usuario para ID: ${data.user.id}`);
            const { data: usuarioData, error: usuarioError } = await supabase_1.supabase
                .from('Usuario')
                .select('*')
                .eq('id_usuario', data.user.id)
                .single();
            if (usuarioError || !usuarioData) {
                console.warn('⚠️ [LOGIN] Usuario no encontrado en tabla Usuario:', usuarioError?.message);
                return res.status(404).json({ error: 'Usuario no encontrado en base de datos' });
            }
            console.log(`✅ [LOGIN] Usuario ${data.user.email} autenticado exitosamente`);
            res.json({
                message: 'Login exitoso',
                user: {
                    id: usuarioData.id_usuario,
                    name: usuarioData.nombre,
                    lastname: usuarioData.apellido,
                    email: usuarioData.correo,
                    birthdate: usuarioData.edad,
                },
                session: data.session,
                token: data.session?.access_token,
                refresh_token: data.session?.refresh_token,
            });
        }
        catch (error) {
            console.error('💥 [LOGIN] Error inesperado:', error.message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    async getUserProfile(req, res) {
        console.log('🟢 [GET USER PROFILE] Solicitud recibida');
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            console.warn('⚠️ [GET USER PROFILE] Token ausente');
            return res.status(401).json({ error: 'Token requerido' });
        }
        try {
            console.log('🔹 [GET USER PROFILE] Validando token...');
            const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
            if (error || !user) {
                console.error('❌ [GET USER PROFILE] Token inválido o expirado:', error?.message);
                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
            console.log(`🔹 [GET USER PROFILE] Buscando perfil de ID: ${user.id}`);
            const { data: usuarioData, error: usuarioError } = await supabase_1.supabase
                .from('Usuario')
                .select('*')
                .eq('id_usuario', user.id)
                .single();
            if (usuarioError || !usuarioData) {
                console.error('❌ [GET USER PROFILE] Error obteniendo perfil:', usuarioError?.message);
                return res.status(500).json({ error: 'No se encontró perfil en tabla Usuario' });
            }
            console.log(`✅ [GET USER PROFILE] Perfil obtenido correctamente para ${usuarioData.correo}`);
            const birthdate = usuarioData.edad || '';
            const age = birthdate ? this.calculateAge(birthdate) : null;
            res.json({
                id: usuarioData.id_usuario,
                name: usuarioData.nombre,
                lastname: usuarioData.apellido,
                email: usuarioData.correo,
                birthdate,
                age,
            });
        }
        catch (error) {
            console.error('💥 [GET USER PROFILE] Error inesperado:', error.message);
            res.status(500).json({ error: 'Error al obtener perfil del usuario' });
        }
    }
    async updateUser(req, res) {
        console.log('🟢 [UPDATE USER] Solicitud recibida');
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            console.warn('⚠️ [UPDATE USER] Token ausente');
            return res.status(401).json({ error: 'Token requerido' });
        }
        try {
            const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
            if (userError || !user) {
                console.error('❌ [UPDATE USER] Token inválido o expirado:', userError?.message);
                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
            const { name, lastname, email, birthdate } = req.body;
            console.log(`🔹 [UPDATE USER] Actualizando datos para: ${user.email}`);
            const authUpdates = {};
            if (email)
                authUpdates.email = email;
            if (name || lastname) {
                authUpdates.data = {
                    ...(user.user_metadata || {}),
                    ...(name && { nombre: name }),
                    ...(lastname && { apellido: lastname }),
                };
            }
            if (Object.keys(authUpdates).length > 0) {
                console.log('🔹 [UPDATE USER] Actualizando datos en Auth...');
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
            console.log('🔹 [UPDATE USER] Actualizando tabla Usuario...');
            const { data: userData, error: userUpdateError } = await supabase_1.supabase
                .from('Usuario')
                .update(userUpdates)
                .eq('id_usuario', user.id)
                .select()
                .single();
            if (userUpdateError)
                throw userUpdateError;
            console.log('✅ [UPDATE USER] Usuario actualizado exitosamente');
            res.json({
                message: 'Usuario actualizado exitosamente',
                user: {
                    id: userData.id_usuario,
                    name: userData.nombre,
                    lastname: userData.apellido,
                    email: userData.correo,
                    birthdate: userData.edad,
                },
            });
        }
        catch (error) {
            console.error('💥 [UPDATE USER] Error inesperado:', error.message);
            res.status(500).json({ error: 'Error al actualizar usuario' });
        }
    }
    async forgotPassword(req, res) {
        console.log('🟢 [FORGOT PASSWORD] Solicitud recibida:', req.body);
        const normalizedData = this.normalizeUserData(req.body);
        const { email } = normalizedData;
        if (!email) {
            console.warn('⚠️ [FORGOT PASSWORD] Falta el campo email');
            return res.status(400).json({ error: 'Correo/email es requerido' });
        }
        try {
            console.log('🔹 [FORGOT PASSWORD] Generando token de recuperación...');
            const resetToken = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
            console.log('🔹 [FORGOT PASSWORD] Enviando correo de recuperación...');
            if (emailService_1.sendRecoveryEmail) {
                await (0, emailService_1.sendRecoveryEmail)(email, resetToken);
            }
            else {
                console.warn('⚠️ [FORGOT PASSWORD] Servicio de email no disponible');
                console.log(`🔗 Token generado: ${resetToken}`);
            }
            console.log(`✅ [FORGOT PASSWORD] Correo enviado a ${email}`);
            res.json({
                message: 'Correo de recuperación enviado',
                ...(process.env.NODE_ENV === 'development' && { token: resetToken })
            });
        }
        catch (error) {
            console.error('💥 [FORGOT PASSWORD] Error inesperado:', error.message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    async resetPassword(req, res) {
        console.log('🟢 [RESET PASSWORD] Solicitud recibida');
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            console.warn('⚠️ [RESET PASSWORD] Token o contraseña faltante');
            return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
        }
        try {
            console.log('🔹 [RESET PASSWORD] Verificando token JWT...');
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            const email = decoded.email || decoded.correo;
            if (!email) {
                return res.status(400).json({ error: 'Token inválido: email no encontrado' });
            }
            console.log(`📧 [RESET PASSWORD] Token válido, email: ${email}`);
            const { error: resetError } = await supabase_1.supabase.auth.updateUser({
                password: newPassword
            });
            if (resetError) {
                console.error('❌ [RESET PASSWORD] Error actualizando contraseña:', resetError.message);
                if (resetError.message.includes('different from the old')) {
                    return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la anterior' });
                }
                throw resetError;
            }
            console.log(`✅ [RESET PASSWORD] Contraseña actualizada correctamente para ${email}`);
            res.json({ message: 'Contraseña actualizada correctamente' });
        }
        catch (error) {
            console.error('💥 [RESET PASSWORD] Error:', error.message);
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(400).json({ error: 'Token inválido o expirado' });
            }
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    async deleteAccount(req, res) {
        console.log('🟢 [DELETE ACCOUNT] Solicitud recibida');
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }
        try {
            const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser(token);
            if (userError || !user) {
                return res.status(401).json({ error: 'Token inválido' });
            }
            console.log(`🔹 Eliminando cuenta de: ${user.email}`);
            await supabase_1.supabase.from('Favoritos').delete().eq('id_usuario', user.id);
            await supabase_1.supabase.from('Historial_Reproduccion').delete().eq('id_usuario', user.id);
            await supabase_1.supabase.from('Calificaciones').delete().eq('id_usuario', user.id);
            await supabase_1.supabase.from('Usuario').delete().eq('id_usuario', user.id);
            const newEmail = `deleted_${Date.now()}_${user.id}@moviewave.com`;
            await supabase_1.supabase.auth.admin.updateUserById(user.id, {
                email: newEmail,
                user_metadata: {
                    deleted: true,
                    original_email: user.email,
                    deleted_at: new Date().toISOString()
                }
            });
            console.log('✅ Cuenta eliminada exitosamente');
            res.json({
                message: 'Cuenta eliminada exitosamente',
                original_email: user.email,
                note: 'Puedes usar el mismo email para registrarte nuevamente'
            });
        }
        catch (error) {
            console.error('💥 Error eliminando cuenta:', error);
            res.status(500).json({ error: 'Error eliminando cuenta' });
        }
    }
}
exports.default = new AuthController();
