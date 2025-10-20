"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRecoveryEmail = void 0;
const sib_api_v3_sdk_1 = __importDefault(require("sib-api-v3-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log("📧 Inicializando módulo de envío de correos (email.ts)...");
try {
    console.log("🔐 Cargando API key de Brevo...");
    const defaultClient = sib_api_v3_sdk_1.default.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    if (!process.env.BREVO_API_KEY) {
        console.error("❌ Faltante: BREVO_API_KEY no está definida en .env");
    }
    else {
        console.log("✅ BREVO_API_KEY cargada correctamente (longitud:", process.env.BREVO_API_KEY.length, ")");
    }
    apiKey.apiKey = process.env.BREVO_API_KEY;
}
catch (err) {
    console.error("❌ Error inicializando cliente Brevo:", err);
}
const brevoApi = new sib_api_v3_sdk_1.default.TransactionalEmailsApi();
console.log("✅ Cliente de Brevo listo para enviar correos");
const sendRecoveryEmail = async (userEmail, resetToken) => {
    try {
        console.log("🔄 Preparando envío de email a:", userEmail);
        console.log("🔑 Token de recuperación (truncado):", resetToken.slice(0, 10) + "...");
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        console.log("🌐 URL del frontend detectada:", frontendUrl);
        const recoveryLink = `${frontendUrl}/resetpassword?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;
        console.log("🔗 Enlace de recuperación generado:", recoveryLink);
        const senderEmail = process.env.EMAIL_SENDER || "noreply@moviewave.app";
        console.log("📤 Correo remitente configurado:", senderEmail);
        const sendSmtpEmail = {
            sender: {
                email: senderEmail,
                name: "MovieWave",
            },
            to: [{ email: userEmail }],
            subject: "🔑 Recuperación de Contraseña - MovieWave",
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
        console.log("📦 Preparando envío del email a Brevo...");
        const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
        console.log("✅ Email enviado correctamente con ID:", response?.messageId || "Sin ID");
        console.log("📨 Respuesta completa de Brevo:", JSON.stringify(response, null, 2));
    }
    catch (error) {
        console.error("❌ Error enviando correo con Brevo:");
        console.error("   • Mensaje:", error.message || error);
        console.error("   • Stack:", error.stack || "Sin stack disponible");
        throw new Error(`Error al enviar email: ${error.message}`);
    }
};
exports.sendRecoveryEmail = sendRecoveryEmail;
