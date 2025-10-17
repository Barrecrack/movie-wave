"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRecoveryEmail = void 0;
const sib_api_v3_sdk_1 = __importDefault(require("sib-api-v3-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const defaultClient = sib_api_v3_sdk_1.default.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const brevoApi = new sib_api_v3_sdk_1.default.TransactionalEmailsApi();
const sendRecoveryEmail = async (userEmail, resetToken) => {
    try {
        console.log("🔄 Preparando envío de email a:", userEmail);
        const recoveryLink = `${process.env.FRONTEND_URL}/#/reset_password?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;
        console.log("🔗 Enlace de recuperación generado:", recoveryLink);
        const sendSmtpEmail = {
            sender: { email: process.env.EMAIL_SENDER, name: "MovieWave" },
            to: [{ email: userEmail }],
            subject: "Recuperación de Contraseña - MovieWave",
            htmlContent: `
        <h2>Recupera tu contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${recoveryLink}" style="background-color: #8300BF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
        <p>Este enlace expira en 1 hora.</p>
        <p>Si no solicitaste esto, ignora este email.</p>
      `,
        };
        const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
        console.log("✅ Email enviado por API:", response?.messageId || "OK");
    }
    catch (error) {
        console.error("❌ Error enviando correo:", error.message || error);
        throw new Error(`Error al enviar email: ${error.message}`);
    }
};
exports.sendRecoveryEmail = sendRecoveryEmail;
