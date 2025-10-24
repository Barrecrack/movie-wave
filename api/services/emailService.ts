import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

console.log('🔹 Cargando configuración de Brevo (Sendinblue)...');
dotenv.config();

// Configure Brevo API client
console.log('🔹 Inicializando cliente de Brevo...');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY!;
console.log('✅ Clave API configurada:', process.env.BREVO_API_KEY ? 'OK' : '❌ NO DEFINIDA');

const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();
console.log('✅ Cliente de correo Brevo inicializado correctamente.');

/**
 * Send a password recovery email using the Brevo API
 */
export const sendRecoveryEmail = async (userEmail: string, resetToken: string) => {
  console.log('📩 [sendRecoveryEmail] Iniciando proceso para:', userEmail);
  try {
    console.log('🔄 Preparando envío de email a:', userEmail);

    // Use the frontend URL from an environment variable
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log('🌍 URL frontend detectada:', frontendUrl);

    const recoveryLink = `${frontendUrl}/resetpassword?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;
    console.log('🔗 Enlace de recuperación generado:', recoveryLink);

    const sendSmtpEmail = {
      sender: { email: process.env.EMAIL_SENDER || 'noreply@moviewave.app', name: 'MovieWave' },
      to: [{ email: userEmail }],
      subject: '🔑 Recuperación de Contraseña - MovieWave',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color:#8300BF;">Recupera tu contraseña</h2>
          <p>Hola 👋, has solicitado restablecer tu contraseña en MovieWave.</p>
          <p>Haz clic en el siguiente botón para restablecerla:</p>
          <p>
            <a href="${recoveryLink}" 
               style="background-color: #8300BF; color: white; padding: 10px 20px;
                      text-decoration: none; border-radius: 5px; display:inline-block;">
              Restablecer Contraseña
            </a>
          </p>
          <p>⚠️ Este enlace expira en 1 hora.</p>
          <p>Si no solicitaste este cambio, simplemente ignora este correo.</p>
          <hr />
          <p style="font-size:12px;color:#999;">© ${new Date().getFullYear()} MovieWave</p>
        </div>
      `,
      textContent: `
        Recuperación de contraseña - MovieWave

        Hola, has solicitado restablecer tu contraseña.
        Haz clic en este enlace para continuar:
        ${recoveryLink}

        Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.
      `,
    };

    console.log('📨 Enviando correo mediante Brevo...');
    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email enviado correctamente con ID:', response?.messageId || 'OK');
  } catch (error: any) {
    console.error('❌ Error enviando correo:', error.message || error);
    throw new Error(`Error al enviar email: ${error.message}`);
  }
};
