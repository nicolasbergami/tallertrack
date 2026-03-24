import { Resend } from "resend";
import { env } from "../../config/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<void> {
  if (!resend) {
    // Dev fallback: loguear en consola si no hay API key
    console.log(`[Email/DEV] Password reset link for ${toEmail}:\n${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to:   toEmail,
    subject: "Recuperá tu contraseña — TallerTrack",
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <body style="margin:0;padding:0;background:#0F172A;font-family:system-ui,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;padding:40px 20px;">
          <tr><td align="center">
            <table width="100%" style="max-width:480px;background:#1E293B;border-radius:16px;
                                       border:1px solid #334155;padding:40px 32px;">
              <tr><td style="text-align:center;padding-bottom:28px;">
                <span style="color:#F97316;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
                  TallerTrack
                </span>
              </td></tr>

              <tr><td style="color:#F1F5F9;font-size:18px;font-weight:700;
                             padding-bottom:12px;text-align:center;">
                Recuperá tu contraseña
              </td></tr>

              <tr><td style="color:#94A3B8;font-size:14px;line-height:1.6;
                             padding-bottom:28px;text-align:center;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br>
                Este enlace es válido durante <strong style="color:#F1F5F9;">1 hora</strong>.
              </td></tr>

              <tr><td style="text-align:center;padding-bottom:28px;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:#F97316;color:#ffffff;
                          font-weight:700;font-size:15px;text-decoration:none;
                          padding:14px 32px;border-radius:12px;">
                  Restablecer contraseña
                </a>
              </td></tr>

              <tr><td style="color:#475569;font-size:12px;line-height:1.5;text-align:center;
                             border-top:1px solid #334155;padding-top:20px;">
                Si no solicitaste esto, podés ignorar este correo.<br>
                Tu contraseña no cambiará.
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}
