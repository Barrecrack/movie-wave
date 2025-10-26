"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRecoveryEmail = void 0;
const sib_api_v3_sdk_1 = __importDefault(require("sib-api-v3-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
console.log('🔹 Cargando configuración de Brevo (Sendinblue)...');
dotenv_1.default.config();
console.log('🔹 Inicializando cliente de Brevo...');
const defaultClient = sib_api_v3_sdk_1.default.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
console.log('✅ Clave API configurada:', process.env.BREVO_API_KEY ? 'OK' : '❌ NO DEFINIDA');
const brevoApi = new sib_api_v3_sdk_1.default.TransactionalEmailsApi();
console.log('✅ Cliente de correo Brevo inicializado correctamente.');
const sendRecoveryEmail = async (userEmail, resetToken) => {
    console.log('📩 [sendRecoveryEmail] Iniciando proceso para:', userEmail);
    try {
        console.log('🔄 Preparando envío de email a:', userEmail);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        console.log('🌍 URL frontend detectada:', frontendUrl);
        const recoveryLink = `${frontendUrl}/resetpassword?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;
        console.log('🔗 Enlace de recuperación generado:', recoveryLink);
        const sendSmtpEmail = {
            sender: { email: process.env.EMAIL_SENDER || 'noreply@moviewave.app', name: 'MovieWave' },
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
            <p style="font-size:12px; color:#888; text-align:center;">© ${new Date().getFullYear()} MovieWave - Todos los derechos reservados</p>
          </div>
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
    }
    catch (error) {
        console.error('❌ Error enviando correo:', error.message || error);
        throw new Error(`Error al enviar email: ${error.message}`);
    }
};
exports.sendRecoveryEmail = sendRecoveryEmail;
