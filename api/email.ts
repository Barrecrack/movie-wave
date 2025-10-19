import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";

dotenv.config();

// Configurar cliente API de Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY!;

const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Envía un correo de recuperación de contraseña usando Brevo API
 */
export const sendRecoveryEmail = async (userEmail: string, resetToken: string) => {
  try {
    console.log("🔄 Preparando envío de email a:", userEmail);

    const recoveryLink = `${process.env.FRONTEND_URL}/resetpassword?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;
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
  } catch (error: any) {
    console.error("❌ Error enviando correo:", error.message || error);
    throw new Error(`Error al enviar email: ${error.message}`);
  }
};
