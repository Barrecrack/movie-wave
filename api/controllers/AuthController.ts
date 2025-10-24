import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';
import { sendRecoveryEmail } from '../services/emailService';
import { Request, Response } from 'express';

class AuthController {
  async register(req: Request, res: Response) {
    console.log('🟢 [REGISTER] Solicitud recibida con body:', req.body);
    const { email, password, name, lastname } = req.body;
    try {
      console.log('🔹 Registrando usuario en Supabase...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, lastname },
        },
      });
      if (error) throw error;
      console.log('✅ Usuario registrado correctamente:', data.user?.email);
      res.status(201).json({ user: data.user });
    } catch (error: any) {
      console.error('❌ Error en registro:', error.message);
      res.status(500).json({ error: 'Error al registrar usuario' });
    }
  }

  async login(req: Request, res: Response) {
    console.log('🟢 [LOGIN] Intento de inicio de sesión con email:', req.body.email);
    const { email, password } = req.body;
    try {
      console.log('🔹 Autenticando usuario en Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      console.log('✅ Login exitoso para:', data.user?.email);
      res.json({ user: data.user, token: data.session?.access_token });
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }

  async updateUser(req: Request, res: Response) {
    console.log('🟢 [UPDATE USER] Solicitud de actualización recibida.');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.warn('⚠️ Token no proporcionado en cabecera Authorization.');
      return res.status(401).json({ error: 'Token requerido' });
    }
    try {
      console.log('🔹 Obteniendo usuario desde el token...');
      let { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.warn('⚠️ Token posiblemente expirado, intentando refrescar sesión...');
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed?.user) {
          console.error('❌ Sesión inválida o no se pudo refrescar.');
          return res.status(401).json({ error: 'Token inválido o sesión expirada' });
        }
        user = refreshed.user;
      }
      const { name, lastname, email, password } = req.body;
      console.log('🔹 Actualizando datos del usuario:', user.email);

      if (!process.env.SERVICE_ROLE_KEY) {
        console.warn('⚠️ SERVICE_ROLE_KEY no definida, usando auth.updateUser()');
        const { data, error } = await supabase.auth.updateUser({
          email: email || user.email,
          password: password || undefined,
          data: {
            name: name || user.user_metadata?.name,
            lastname: lastname || user.user_metadata?.lastname,
          },
        });
        if (error) throw error;
        console.log('✅ Usuario actualizado (modo normal):', data.user?.email);
        return res.json({ user: data.user });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        email,
        password: password || undefined,
        user_metadata: { name, lastname },
      });
      if (updateError) throw updateError;
      console.log('✅ Usuario actualizado correctamente (modo admin).');
      res.json({ message: 'Perfil actualizado correctamente' });
    } catch (error: any) {
      console.error('❌ Error en update-user:', error.message);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    console.log('🟢 [FORGOT PASSWORD] Solicitud recibida para:', req.body.email);
    const { email } = req.body;
    try {
      console.log('🔹 Generando token de recuperación...');
      const resetToken = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
      console.log('🔹 Enviando correo de recuperación...');
      await sendRecoveryEmail(email, resetToken);
      console.log('✅ Correo de recuperación enviado correctamente.');
      res.json({ message: 'Correo de recuperación enviado' });
    } catch (error: any) {
      console.error('❌ Error en forgot-password:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  async resetPassword(req: Request, res: Response) {
    console.log('🟢 [RESET PASSWORD] Solicitud de reseteo recibida.');
    const { token, newPassword } = req.body;
    try {
      console.log('🔹 Verificando token JWT...');
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const email = decoded.email;
      console.log('🔹 Buscando usuario con email:', email);
      const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
      if (searchError) throw searchError;
      const user = users.find((u: any) => u.email === email);
      if (!user) {
        console.warn('⚠️ Usuario no encontrado.');
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      console.log('🔹 Actualizando contraseña del usuario...');
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });
      if (error) throw error;
      console.log('✅ Contraseña actualizada correctamente para:', user.email);
      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error: any) {
      console.error('❌ Error en reset-password:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AuthController();
