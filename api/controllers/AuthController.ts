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
   * Normalizes user data from different field names (english/spanish)
   */
  private normalizeUserData(body: any) {
    return {
      // Campos en español (prioridad)
      nombre: body.nombre || body.name,
      apellido: body.apellido || body.lastname,
      correo: body.correo || body.email,
      contrasena: body.contrasena || body.password,
      edad: body.edad || body.birthdate,
      
      // Campos en inglés (backward compatibility)
      name: body.name || body.nombre,
      lastname: body.lastname || body.apellido,
      email: body.email || body.correo,
      password: body.password || body.contrasena,
      birthdate: body.birthdate || body.edad
    };
  }

  /**
   * Registers a new user in Supabase and creates entry in Usuario table.
   * 
   * @async
   * @function register
   * @param {Request} req - Express request object containing user data.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Responds with the created user or an error message.
   */
  async register(req: Request, res: Response) {
    console.log('🟢 [REGISTER] Solicitud recibida con body:', req.body);
    
    // Normalizar datos (acepta inglés y español)
    const normalizedData = this.normalizeUserData(req.body);
    const { nombre, apellido, correo, contrasena, edad } = normalizedData;

    try {
      // Validar campos requeridos
      if (!correo || !contrasena || !nombre || !apellido) {
        return res.status(400).json({ 
          error: 'Correo/email, contraseña/password, nombre/name y apellido/lastname son requeridos' 
        });
      }

      console.log('🔹 Registrando usuario en Supabase Auth...');
      
      // Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: correo,
        password: contrasena,
        options: {
          data: {
            nombre,
            apellido,
            edad
          }
        },
      });

      if (authError) {
        console.error('❌ Error en Supabase Auth:', authError.message);
        return res.status(400).json({ error: authError.message });
      }

      if (!authData.user) {
        return res.status(400).json({ error: 'No se pudo crear el usuario en Auth' });
      }

      console.log('✅ Usuario registrado en Auth:', authData.user.email);

      // Crear usuario en tabla Usuario (usando el mismo ID de Auth)
      console.log('🔹 Creando usuario en tabla Usuario...');
      const { data: userData, error: userError } = await supabase
        .from('Usuario')
        .insert([
          {
            id_usuario: authData.user.id, // Mismo ID que Auth
            nombre,
            apellido,
            correo,
            contrasena: contrasena,
            edad: edad ? new Date(edad).toISOString() : null
          }
        ])
        .select()
        .single();

      if (userError) {
        console.error('❌ Error creando usuario en tabla Usuario:', userError.message);
        
        // Si falla la creación en la tabla, no podemos eliminar el usuario de Auth desde el cliente
        console.warn('⚠️ Usuario creado en Auth pero no en tabla Usuario. Se requiere limpieza manual.');
        
        return res.status(400).json({ 
          error: 'Usuario creado en autenticación pero error en base de datos. Contacte soporte.' 
        });
      }

      console.log('✅ Usuario creado en tabla Usuario:', userData.id_usuario);

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: {
          id: userData.id_usuario,
          nombre: userData.nombre,
          apellido: userData.apellido,
          correo: userData.correo,
          edad: userData.edad
        },
        session: authData.session,
        token: authData.session?.access_token
      });

    } catch (error: any) {
      console.error('❌ Error en registro:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Logs in a user with email and password credentials.
   * 
   * @async
   * @function login
   * @param {Request} req - Express request containing user credentials.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Returns the authenticated user, session, and JWT tokens.
   */
  async login(req: Request, res: Response) {
    console.log('🟢 [LOGIN] Intento de inicio de sesión con body:', req.body);
    
    // Normalizar datos
    const normalizedData = this.normalizeUserData(req.body);
    const { correo, contrasena } = normalizedData;

    try {
      if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Correo/email y contraseña/password son requeridos' });
      }

      console.log('🔹 Autenticando usuario...');
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: correo, 
        password: contrasena 
      });
      
      if (error) throw error;

      // Obtener datos adicionales del usuario desde la tabla Usuario
      const { data: userData, error: userError } = await supabase
        .from('Usuario')
        .select('*')
        .eq('id_usuario', data.user.id)
        .single();

      if (userError) {
        console.error('❌ Error obteniendo datos del usuario:', userError.message);
      }

      console.log('✅ Login exitoso para:', data.user.email);

      res.json({
        message: 'Login exitoso',
        user: {
          id: data.user.id,
          nombre: userData?.nombre || data.user.user_metadata?.nombre,
          apellido: userData?.apellido || data.user.user_metadata?.apellido,
          correo: data.user.email,
          edad: userData?.edad
        },
        session: data.session,
        token: data.session?.access_token,
        refresh_token: data.session?.refresh_token
      });
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }

  /**
   * Updates user information.
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

      // Normalizar datos del body
      const normalizedData = this.normalizeUserData(req.body);
      const { nombre, apellido, correo, edad } = normalizedData;

      console.log('🔹 Actualizando datos del usuario:', user.email);

      // Actualizar en Auth (metadatos)
      const authUpdates: any = {};
      if (nombre !== undefined) authUpdates.data = { ...authUpdates.data, nombre };
      if (apellido !== undefined) authUpdates.data = { ...authUpdates.data, apellido };
      if (correo !== undefined) authUpdates.email = correo;

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) throw authError;
      }

      // Actualizar en tabla Usuario
      const userUpdates: any = {};
      if (nombre !== undefined) userUpdates.nombre = nombre;
      if (apellido !== undefined) userUpdates.apellido = apellido;
      if (correo !== undefined) userUpdates.correo = correo;
      if (edad !== undefined) userUpdates.edad = new Date(edad).toISOString();

      if (Object.keys(userUpdates).length > 0) {
        const { data: userData, error: userUpdateError } = await supabase
          .from('Usuario')
          .update(userUpdates)
          .eq('id_usuario', user.id)
          .select()
          .single();

        if (userUpdateError) throw userUpdateError;

        console.log('✅ Usuario actualizado correctamente:', user.email);
        res.json({ 
          message: 'Usuario actualizado exitosamente',
          user: userData 
        });
      } else {
        res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
      }

    } catch (error: any) {
      console.error('❌ Error en update-user:', error.message);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }

  /**
   * Sends a password recovery email to the user using custom JWT implementation.
   * 
   * @async
   * @function forgotPassword
   * @param {Request} req - Express request containing the user's email.
   * @param {Response} res - Express response object.
   * @returns {Promise<void>} Returns a success message or an error.
   */
  async forgotPassword(req: Request, res: Response) {
    console.log('🟢 [FORGOT PASSWORD] Solicitud recibida para:', req.body);
    
    // Normalizar datos
    const normalizedData = this.normalizeUserData(req.body);
    const { correo } = normalizedData;

    if (!correo) {
      return res.status(400).json({ error: 'Correo/email es requerido' });
    }

    try {
      console.log('🔹 Generando token de recuperación...');
      const resetToken = jwt.sign({ correo }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1h',
      });

      console.log('🔹 Enviando correo de recuperación...');
      
      // Usar tu servicio de email personalizado
      if (sendRecoveryEmail) {
        await sendRecoveryEmail(correo, resetToken);
      } else {
        console.warn('⚠️ Servicio de email no disponible, usando consola:');
        console.log(`🔗 Link de recuperación: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);
      }

      console.log('✅ Correo de recuperación enviado correctamente.');
      res.json({ 
        message: 'Correo de recuperación enviado',
        // En desarrollo, puedes retornar el token para testing
        ...(process.env.NODE_ENV === 'development' && { token: resetToken })
      });
    } catch (error: any) {
      console.error('❌ Error en forgot-password:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
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

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }

    try {
      console.log('🔹 Verificando token JWT...');
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const correo = decoded.correo;
      console.log('📧 Email decodificado del token:', correo);

      // Buscar usuario por email
      const { data: userData, error: userError } = await supabase
        .from('Usuario')
        .select('id_usuario, correo')
        .eq('correo', correo)
        .single();

      if (userError || !userData) {
        console.warn('⚠️ Usuario no encontrado en la base de datos.');
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log('🔹 Actualizando contraseña del usuario con ID:', userData.id_usuario);
      
      // Actualizar contraseña usando Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('❌ Error actualizando contraseña:', updateError.message);
        throw updateError;
      }

      console.log('✅ Contraseña actualizada correctamente para:', correo);
      res.json({ message: 'Contraseña actualizada correctamente' });

    } catch (error: any) {
      console.error('❌ Error en reset-password:', error.message);
      
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'Token inválido o expirado' });
      }
      
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Deletes the authenticated user's account from both Auth and Usuario table.
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

      console.log('🔹 Eliminando usuario de tabla Usuario:', user.email);

      // Eliminar de tabla Usuario primero
      const { error: deleteError } = await supabase
        .from('Usuario')
        .delete()
        .eq('id_usuario', user.id);

      if (deleteError) {
        console.error('❌ Error eliminando usuario de tabla Usuario:', deleteError.message);
        return res.status(500).json({ error: 'Error eliminando cuenta' });
      }

      // Para eliminar completamente de Auth se necesita función edge o admin
      // Por ahora, desactivamos la cuenta cambiando el email
      console.log('🔹 Desactivando cuenta en Auth...');
      const deletedEmail = `deleted_${Date.now()}@deleted.account`;
      const { error: authUpdateError } = await supabase.auth.updateUser({
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

    } catch (error: any) {
      console.error('❌ Error en delete-account:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
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

      // Obtener datos completos del usuario desde tabla Usuario
      const { data: userData, error: userError } = await supabase
        .from('Usuario')
        .select('*')
        .eq('id_usuario', user.id)
        .single();

      if (userError) {
        console.error('❌ Error obteniendo datos de tabla Usuario:', userError.message);
        return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
      }

      const edad = userData?.edad;
      const age = edad ? this.calculateAge(edad) : null;

      res.json({
        id: userData.id_usuario,
        nombre: userData.nombre || '',
        apellido: userData.apellido || '',
        correo: userData.correo || '',
        edad: edad || '',
        age: age
      });
    } catch (error: any) {
      console.error('❌ Error obteniendo perfil:', error.message);
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  }
}

export default new AuthController();