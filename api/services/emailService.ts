import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

console.log('🔹 Cargando configuración de Brevo (Sendinblue)...');
dotenv.config();

// ======================================================
// 🔹 VALIDACIÓN DE VARIABLES DE ENTORNO
// ======================================================
if (!process.env.BREVO_API_KEY) {
  console.error('❌ BREVO_API_KEY no definida en el archivo .env');
  throw new Error('Falta BREVO_API_KEY en variables de entorno');
}

if (!process.env.EMAIL_SENDER) {
  console.warn('⚠️ EMAIL_SENDER no definida, usando remitente por defecto.');
}

if (!process.env.FRONTEND_URL) {
  console.warn('⚠️ FRONTEND_URL no definida, usando http://localhost:5173.');
}

// ======================================================
// 🔹 CONFIGURACIÓN DEL CLIENTE BREVO
// ======================================================
console.log('🔹 Inicializando cliente de Brevo...');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY!;
console.log('✅ Clave API configurada correctamente.');

const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();
console.log('✅ Cliente de correo Brevo inicializado.');

// ======================================================
// 🔹 FUNCIÓN: Envío de correo de recuperación
// ======================================================
export const sendRecoveryEmail = async (userEmail: string, resetToken: string) => {
  console.log('\n==============================');
  console.log('📩 [sendRecoveryEmail] Iniciando proceso');
  console.log('📧 Destinatario:', userEmail);
  console.log('==============================');

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const senderEmail = process.env.EMAIL_SENDER || 'noreply@moviewave.app';

    const recoveryLink = `${frontendUrl}/resetpassword?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;
    console.log('🔗 Enlace de recuperación generado:', recoveryLink);

    const year = new Date().getFullYear();
    const sendSmtpEmail = {
      sender: { email: senderEmail, name: 'MovieWave' },
      to: [{ email: userEmail }],
      subject: '🔑 Recuperación de Contraseña - MovieWave',
      htmlContent: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f9ff; color: #222; padding: 30px; border-radius: 10px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); padding: 30px;">
            <h2 style="color:#0078d7; text-align:center;">🔐 Recupera tu contraseña</h2>
            <p style="font-size:16px; line-height:1.5;">Hola 👋, has solicitado restablecer tu contraseña en <strong>MovieWave</strong>.</p>
            <p style="font-size:16px; line-height:1.5;">Haz clic en el siguiente botón para restablecerla:</p>
            <div style="text-align:center; margin: 30px 0;">
              <a href="${recoveryLink}"
                style="background-color:#009dff; color:#fff; padding: 12px 25px; border-radius:8px;
                       text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
                Restablecer Contraseña
              </a>
            </div>
            <p style="font-size:15px; color:#444;">⚠️ Este enlace expira en 1 hora.</p>
            <p style="font-size:15px; color:#444;">Si no solicitaste este cambio, simplemente ignora este correo.</p>
            <hr style="border:none; border-top:1px solid #ddd; margin:30px 0;">
            <p style="font-size:12px; color:#888; text-align:center;">© ${year} MovieWave - Todos los derechos reservados</p>
          </div>
        </div>
      `,
      textContent: `
        Recuperación de contraseña - MovieWave

        Hola, has solicitado restablecer tu contraseña.
        Haz clic en este enlace para continuar:
        ${recoveryLink}

        Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.

        © ${year} MovieWave
      `,
    };

    console.log('📨 Enviando correo mediante Brevo...');
    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Email enviado correctamente.');
    console.log('📬 Estado:', response?.response?.status || 'OK');
    console.log('🆔 Message ID:', response?.messageId || 'N/A');
    console.log('🕒 Fecha de envío:', new Date().toLocaleString());
    console.log('==============================\n');
  } catch (error: any) {
    console.error('❌ Error al enviar correo de recuperación:');
    if (error.response && error.response.body) {
      console.error('📛 Código HTTP:', error.response.status);
      console.error('📄 Detalle:', JSON.stringify(error.response.body, null, 2));
    } else {
      console.error('📄 Error genérico:', error.message || error);
    }
    throw new Error(`Error al enviar email: ${error.message}`);
  }
};
