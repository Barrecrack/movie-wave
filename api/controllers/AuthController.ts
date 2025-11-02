/**
 * @file AuthController.js
 * @description Handles all authentication-related operations such as user registration, login,
 * profile updates, password recovery, and password reset using Supabase authentication and JWT.
 */

import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';
import { sendRecoveryEmail } from '../services/emailService';
import { Request, Response } from 'express';

/**
 * @class AuthController
 * @classdesc Controller that manages authentication and user-related actions using Supabase.
 */
class AuthController {

  /**
   * Calculates age from birthdate
   */
  private calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }


  /**
   * Registers a new user in Supabase.
   * 
   * @async
   * @function register
   * @param {Request} req - Express request object containing email, password, name, and lastname.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Responds with the created user or an error message.
   */
  async register(req: Request, res: Response) {
    console.log('🟢 [REGISTER] Solicitud recibida con body:', req.body);
    const { email, password, name, lastname, birthdate } = req.body; // 👈 Cambiar a birthdate

    try {
      console.log('🔹 Registrando usuario en Supabase con role key...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            lastname,
            birthdate // 👈 Guardar fecha de nacimiento
          }
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

  /**
   * Logs in a user with email and password credentials.
   * 
   * @async
   * @function login
   * @param {Request} req - Express request containing email and password.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Returns the authenticated user, session, and JWT tokens.
   */
  async login(req: Request, res: Response) {
    console.log('🟢 [LOGIN] Intento de inicio de sesión con email:', req.body.email);
    const { email, password } = req.body;

    try {
      console.log('🔹 Autenticando usuario con role key...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      console.log('✅ Login exitoso para:', data.user?.email);

      res.json({
        user: data.user,
        session: data.session,
        token: data.session?.access_token,
        refresh_token: data.session?.refresh_token
      });
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }

  /**
   * Updates user information such as name, lastname, email, or password.
   * Requires a valid authentication token.
   * 
   * @async
   * @function updateUser
   * @param {Request} req - Express request containing the token and updated user data.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Returns the updated user data or an error message.
   */
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

      const { name, lastname, email, password, birthdate } = req.body; // 👈 Agregar birthdate
      console.log('🔹 Actualizando datos del usuario:', user.email);

      const { data, error } = await supabase.auth.updateUser({
        email: email || user.email,
        password: password || undefined,
        data: {
          name: name || user.user_metadata?.name,
          lastname: lastname || user.user_metadata?.lastname,
          birthdate: birthdate || user.user_metadata?.birthdate, // 👈 Actualizar birthdate
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

  /**
   * Sends a password recovery email to the user.
   * Generates a JWT token valid for one hour and sends it via email.
   * 
   * @async
   * @function forgotPassword
   * @param {Request} req - Express request containing the user's email.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Returns a success message or an error.
   */
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

  /**
   * Resets the user's password using a valid JWT token.
   * 
   * @async
   * @function resetPassword
   * @param {Request} req - Express request containing the token and new password.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Returns success or error messages.
   */
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


  /**
 * Deletes the authenticated user's account by updating their email and disabling la cuenta.
 * 
 * @async
 * @function deleteAccount
 * @param {Request} req - Express request containing the authorization token.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} Returns success or error message.
 */
  async deleteAccount(req: Request, res: Response) {
    console.log('🟢 [DELETE ACCOUNT] Solicitud de eliminación de cuenta recibida');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    try {
      // Verificar el usuario desde el token
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }

      console.log('🔹 Desactivando cuenta del usuario:', user.email);

      // Estrategia 1: Cambiar el email a un formato que indique cuenta eliminada
      // y establecer una contraseña aleatoria para invalidar el acceso
      const deletedEmail = `deleted_${Date.now()}@deleted.moviewave`;
      const randomPassword = Math.random().toString(36).slice(-16) + 'Aa1!';

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          email: deletedEmail,
          password: randomPassword,
          user_metadata: {
            ...user.user_metadata,
            account_deleted: true,
            deleted_at: new Date().toISOString(),
            original_email: user.email // Guardar el email original para referencia
          }
        }
      );

      if (updateError) {
        console.error('❌ Error desactivando usuario:', updateError);
        throw updateError;
      }

      console.log('✅ Cuenta desactivada correctamente. Email original:', user.email);
      res.json({
        message: 'Cuenta eliminada permanentemente',
        original_email: user.email
      });

    } catch (error: any) {
      console.error('❌ Error en delete-account:', error.message);

      // Si falla la actualización, intentar una estrategia alternativa
      if (error.message.includes('updateUserById')) {
        res.status(500).json({
          error: 'No se pudo eliminar la cuenta en este momento. Por favor, contacta al soporte.'
        });
      } else {
        res.status(500).json({ error: 'Error al eliminar la cuenta' });
      }
    }
  }





  /**
   * Retrieves the authenticated user's profile data using the provided token.
   * 
   * @async
   * @function getUserProfile
   * @param {Request} req - Express request containing the authorization token.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Returns the user's profile data or an error message.
   */
  async getUserProfile(req: Request, res: Response) {
    console.log('🟢 [GET USER PROFILE] Solicitud recibida');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }

      const birthdate = user.user_metadata?.birthdate;
      const age = birthdate ? this.calculateAge(birthdate) : null;

      res.json({
        name: user.user_metadata?.name || '',
        lastname: user.user_metadata?.lastname || '',
        email: user.email || '',
        birthdate: birthdate || '', // 👈 Enviar fecha de nacimiento
        age: age // 👈 Enviar edad calculada
      });
    } catch (error: any) {
      console.error('❌ Error obteniendo perfil:', error.message);
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  }
}

export default new AuthController();
