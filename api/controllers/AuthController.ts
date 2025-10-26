import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';
import { sendRecoveryEmail } from '../services/emailService';
import { Request, Response } from 'express';

class AuthController {
  // 🔹 Registro de usuario
  async register(req: Request, res: Response) {
    console.log('🟢 [REGISTER] Solicitud recibida con body:', req.body);
    const { email, password, name, lastname } = req.body;

    try {
      console.log('🔹 Registrando usuario en Supabase con role key...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, lastname } },
      });

      if (error) throw error;
      console.log('✅ Usuario registrado correctamente:', data.user?.email);
      res.status(201).json({ user: data.user });
    } catch (error: any) {
      console.error('❌ Error en registro:', error.message);
      res.status(500).json({ error: 'Error al registrar usuario' });
    }
  }

  // 🔹 Inicio de sesión
  async login(req: Request, res: Response) {
    console.log('🟢 [LOGIN] Intento de inicio de sesión con email:', req.body.email);
    const { email, password } = req.body;

    try {
      console.log('🔹 Autenticando usuario con role key...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      console.log('✅ Login exitoso para:', data.user?.email);
      res.json({ user: data.user, token: data.session?.access_token });
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }

  // 🔹 Actualización de datos de usuario
  async updateUser(req: Request, res: Response) {
    console.log('🟢 [UPDATE USER] Solicitud de actualización recibida.');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.warn('⚠️ Token no proporcionado en cabecera Authorization.');
      return res.status(401).json({ error: 'Token requerido' });
    }

    try {
      console.log('🔹 Obteniendo usuario desde el token...');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        console.error('❌ No se pudo obtener usuario con el token.');
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }

      const { name, lastname, email, password } = req.body;
      console.log('🔹 Actualizando datos del usuario:', user.email);

      const { data, error } = await supabase.auth.updateUser({
        email: email || user.email,
        password: password || undefined,
        data: {
          name: name || user.user_metadata?.name,
          lastname: lastname || user.user_metadata?.lastname,
        },
      });

      if (error) throw error;
      console.log('✅ Usuario actualizado correctamente:', data.user?.email);
      res.json({ user: data.user });
    } catch (error: any) {
      console.error('❌ Error en update-user:', error.message);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }

  // 🔹 Solicitud de recuperación de contraseña
  async forgotPassword(req: Request, res: Response) {
    console.log('🟢 [FORGOT PASSWORD] Solicitud recibida para:', req.body.email);
    const { email } = req.body;

    try {
      console.log('🔹 Generando token de recuperación...');
      const resetToken = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1h',
      });

      console.log('🔹 Enviando correo de recuperación...');
      await sendRecoveryEmail(email, resetToken);

      console.log('✅ Correo de recuperación enviado correctamente.');
      res.json({ message: 'Correo de recuperación enviado' });
    } catch (error: any) {
      console.error('❌ Error en forgot-password:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  // 🔹 Restablecimiento de contraseña
  async resetPassword(req: Request, res: Response) {
    console.log('🟢 [RESET PASSWORD] Solicitud de reseteo recibida.');
    const { token, newPassword } = req.body;
    console.log('📦 Body recibido:', req.body);

    try {
      console.log('🔹 Verificando token JWT...');
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const email = decoded.email;
      console.log('📧 Email decodificado del token:', email);

      console.log('🔹 Obteniendo lista de usuarios...');
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      console.log(`📋 ${usersData.users.length} usuarios obtenidos.`);
      const user = usersData.users.find((u: any) => u.email === email);

      if (!user) {
        console.warn('⚠️ Usuario no encontrado en Supabase.');
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log('🔹 Actualizando contraseña del usuario con ID:', user.id);
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (error) throw error;
      console.log('✅ Contraseña actualizada correctamente para:', user.email);
      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error: any) {
      console.error('❌ Error en reset-password:', error.message);
      console.error('📛 Stack:', error.stack);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AuthController();
