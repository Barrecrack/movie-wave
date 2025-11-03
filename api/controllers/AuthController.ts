/**
 * @file AuthController.js
 * @description Handles all authentication-related operations - VERSIÓN CON TRIGGER
 */

import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';
import { sendRecoveryEmail } from '../services/emailService';
import { Request, Response } from 'express';

class AuthController {

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

  private normalizeUserData(body: any) {
    // El frontend ahora siempre envía en inglés, así que usamos directamente
    return {
      name: body.name,
      lastname: body.lastname,
      email: body.email,
      password: body.password,
      birthdate: body.birthdate,
    };
  }

  /**
   * 🔥 ESPERA a que el trigger cree el usuario en tabla Usuario
   */
  private async waitForUsuarioCreation(userId: string, maxAttempts: number = 10): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Intento ${attempt}/${maxAttempts} - Buscando usuario en tabla Usuario...`);

      const { data: user, error } = await supabase
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

      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.error(`❌ Usuario no apareció en tabla Usuario después de ${maxAttempts} intentos`);
    return null;
  }

  /**
   * REGISTER - Solo registra en Auth, el trigger crea en Usuario
   */
  async register(req: Request, res: Response) {
    console.log('🟢 [REGISTER] Solicitud recibida:', req.body);

    // 🔥 RECIBIR EN INGLÉS del frontend
    const { name, lastname, email, password, birthdate } = req.body;

    try {
      if (!email || !password || !name || !lastname) {
        return res.status(400).json({
          error: 'Email, password, name y lastname son requeridos'
        });
      }

      console.log('🔹 Registrando usuario en Supabase Auth...');

      // Convertir a español para Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nombre: name,      // ← convertir a español
            apellido: lastname, // ← convertir a español
            edad: birthdate     // ← convertir a español
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

      // Esperar a que el trigger cree el usuario
      const usuarioData = await this.waitForUsuarioCreation(authData.user.id);

      if (!usuarioData) {
        console.error('❌ No se pudo obtener usuario de tabla Usuario');
        return res.status(500).json({ error: 'Error al completar el registro' });
      }

      // 🔥 RESPONDER EN INGLÉS
      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: {
          id: usuarioData.id_usuario,
          name: usuarioData.nombre,        // ← inglés
          lastname: usuarioData.apellido,  // ← inglés
          email: usuarioData.correo,       // ← inglés
          birthdate: usuarioData.edad      // ← inglés
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
   * LOGIN - Versión simplificada con trigger
   */
  async login(req: Request, res: Response) {
    console.log('🟢 [LOGIN] Intento de inicio de sesión:', req.body);

    const { email, password } = req.body;

    try {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y password son requeridos' });
      }

      console.log('🔹 Autenticando usuario...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        console.error('❌ Error de autenticación:', error?.message);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // 🔹 Buscar en la tabla Usuario por el id del auth.user
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('Usuario')
        .select('*')
        .eq('id_usuario', data.user.id)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('⚠️ Usuario no encontrado en tabla Usuario:', usuarioError?.message);
        return res.status(404).json({ error: 'Usuario no encontrado en base de datos' });
      }

      console.log('✅ Login exitoso para:', data.user.email);

      // 🔹 Responder unificado con todos los datos
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
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * GET USER PROFILE - Versión simplificada
   */
  async getUserProfile(req: Request, res: Response) {
    console.log('🟢 [GET USER PROFILE] Solicitud recibida');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    try {
      // Obtener usuario autenticado desde Auth
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }

      // 🔹 Consultar la tabla Usuario por el id del auth.user
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('Usuario')
        .select('*')
        .eq('id_usuario', user.id)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('❌ Error obteniendo perfil:', usuarioError?.message);
        return res.status(500).json({ error: 'No se encontró perfil en tabla Usuario' });
      }

      // Calcular edad si existe fecha de nacimiento
      const birthdate = usuarioData.edad || '';
      const age = birthdate ? this.calculateAge(birthdate) : null;

      // 🔹 Devolver perfil completo en inglés
      res.json({
        id: usuarioData.id_usuario,
        name: usuarioData.nombre || '',
        lastname: usuarioData.apellido || '',
        email: usuarioData.correo || '',
        birthdate: birthdate,
        age: age,
      });
    } catch (error: any) {
      console.error('❌ Error obteniendo perfil:', error.message);
      res.status(500).json({ error: 'Error al obtener perfil del usuario' });
    }
  }

  /**
   * UPDATE USER - Actualiza en Auth y Usuario
   */
  async updateUser(req: Request, res: Response) {
    console.log('🟢 [UPDATE USER] Solicitud recibida.');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    try {
      // Obtener usuario desde Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }

      // Datos recibidos desde frontend
      const { name, lastname, email, birthdate } = req.body;

      console.log('🔹 Actualizando usuario:', user.email);

      // 🔹 Actualizar en Auth (solo si hay email o metadatos)
      const authUpdates: any = {};
      if (email) authUpdates.email = email;
      if (name || lastname) {
        authUpdates.data = {
          ...(user.user_metadata || {}),
          ...(name && { nombre: name }),
          ...(lastname && { apellido: lastname }),
        };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) throw authError;
      }

      // 🔹 Actualizar tabla Usuario
      const userUpdates: any = {};
      if (name !== undefined) userUpdates.nombre = name;
      if (lastname !== undefined) userUpdates.apellido = lastname;
      if (email !== undefined) userUpdates.correo = email;
      if (birthdate !== undefined)
        userUpdates.edad = new Date(birthdate).toISOString().split('T')[0];

      const { data: userData, error: userUpdateError } = await supabase
        .from('Usuario')
        .update(userUpdates)
        .eq('id_usuario', user.id)
        .select()
        .single();

      if (userUpdateError) throw userUpdateError;

      console.log('✅ Usuario actualizado correctamente.');

      // 🔹 Devolver resultado unificado
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
    } catch (error: any) {
      console.error('❌ Error en update-user:', error.message);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }

  /**
  * Sends a password recovery email.
  */
  async forgotPassword(req: Request, res: Response) {
    console.log('🟢 [FORGOT PASSWORD] Solicitud recibida para:', req.body);

    const normalizedData = this.normalizeUserData(req.body);
    const { email } = normalizedData;

    if (!email) {
      return res.status(400).json({ error: 'Correo/email es requerido' });
    }

    try {
      console.log('🔹 Generando token de recuperación...');
      const resetToken = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1h',
      });

      console.log('🔹 Enviando correo de recuperación...');

      if (sendRecoveryEmail) {
        await sendRecoveryEmail(email, resetToken);
      } else {
        console.warn('⚠️ Servicio de email no disponible');
        console.log(`🔗 Token de recuperación: ${resetToken}`);
      }

      console.log('✅ Correo de recuperación enviado correctamente.');
      res.json({
        message: 'Correo de recuperación enviado',
        ...(process.env.NODE_ENV === 'development' && { token: resetToken })
      });
    } catch (error: any) {
      console.error('❌ Error en forgot-password:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Resets the user's password.
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
   * Deletes the authenticated user's account.
   */
  async deleteAccount(req: Request, res: Response) {
    console.log('🟢 [DELETE ACCOUNT] Solicitud de eliminación de cuenta recibida');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }

      console.log('🔹 Eliminando usuario de tabla Usuario:', user.email);

      // Eliminar de tabla Usuario
      const { error: deleteError } = await supabase
        .from('Usuario')
        .delete()
        .eq('id_usuario', user.id);

      if (deleteError) {
        console.error('❌ Error eliminando usuario de tabla Usuario:', deleteError.message);
        return res.status(500).json({ error: 'Error eliminando cuenta' });
      }

      // Desactivar cuenta en Auth cambiando el email
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
}

export default new AuthController();