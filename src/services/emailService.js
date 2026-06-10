const BREVO_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

const getBrevoConfig = () => {
  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } = process.env;

  return {
    apiKey: BREVO_API_KEY,
    senderEmail: BREVO_SENDER_EMAIL,
    senderName: BREVO_SENDER_NAME || "SchoolMed",
  };
};

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
})[char]);

const buildQrImageUrl = (value) => {
  if (!value) return "";

  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(value)}`;
};

const buildReviewEmailHtml = ({
  qrPayload,
  rejectionReason,
  status,
  studentName,
  validationCode,
}) => {
  const isApproved = status === "Aprobada";
  const accent = isApproved ? "#10b981" : "#ef4444";
  const softAccent = isApproved ? "#ecfdf5" : "#fef2f2";
  const qrImageUrl = isApproved ? buildQrImageUrl(qrPayload || validationCode) : "";
  const title = isApproved ? "Excusa medica aprobada" : "Excusa medica rechazada";
  const copy = isApproved
    ? "Coordinacion aprobo la excusa medica. Presenta este codigo QR si el colegio necesita validar el permiso."
    : "Coordinacion reviso la solicitud y la excusa medica fue rechazada.";

  return `
    <!doctype html>
    <html lang="es">
      <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e5edf6;box-shadow:0 18px 40px rgba(15,23,42,0.10);">
                <tr>
                  <td style="background:linear-gradient(135deg,#083344,#0f766e);padding:28px 30px;color:#ffffff;">
                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#a7f3d0;">SchoolMed</p>
                    <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;">${escapeHtml(title)}</h1>
                    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#d1fae5;">${escapeHtml(copy)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${softAccent};border:1px solid ${accent};border-radius:16px;padding:0;">
                      <tr>
                        <td style="padding:18px 20px;">
                          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;color:#475569;">Estado</p>
                          <p style="margin:0;font-size:24px;font-weight:800;color:${accent};">${escapeHtml(status)}</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse;">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:700;">Estudiante</td>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(studentName || "No especificado")}</td>
                      </tr>
                      ${rejectionReason ? `
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:700;">Motivo</td>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(rejectionReason)}</td>
                      </tr>
                      ` : ""}
                      ${isApproved && validationCode ? `
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:700;">Codigo</td>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;font-weight:800;color:#0f766e;">${escapeHtml(validationCode)}</td>
                      </tr>
                      ` : ""}
                    </table>

                    ${isApproved && validationCode ? `
                    <div style="margin-top:26px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:22px;">
                      <p style="margin:0 0 14px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#0f766e;">QR de validacion</p>
                      <img src="${qrImageUrl}" width="220" height="220" alt="QR de validacion ${escapeHtml(validationCode)}" style="display:block;margin:0 auto;border-radius:12px;border:10px solid #ffffff;box-shadow:0 10px 25px rgba(15,23,42,0.10);" />
                      <p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:#475569;">Este QR contiene el codigo de validacion de la excusa aprobada.</p>
                    </div>
                    ` : ""}

                    <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Puedes consultar el detalle en SchoolMed. Este mensaje fue generado automaticamente por el sistema institucional.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const buildManualEmailHtml = ({ body, subject }) => `
  <!doctype html>
  <html lang="es">
    <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5edf6;box-shadow:0 18px 40px rgba(15,23,42,0.10);">
              <tr>
                <td style="background:linear-gradient(135deg,#083344,#0f766e);padding:24px 28px;color:#ffffff;">
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#a7f3d0;">SchoolMed</p>
                  <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;">${escapeHtml(subject || "Comunicado institucional")}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 28px;">
                  <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;white-space:pre-line;">${escapeHtml(body || "")}</p>
                  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Mensaje enviado desde SchoolMed.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const sendBrevoEmail = async ({ htmlContent, subject, textContent, to }) => {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();

  if (!apiKey || !senderEmail) {
    return {
      reason: "Brevo API no configurada. Revisa BREVO_API_KEY y BREVO_SENDER_EMAIL.",
      sent: false,
    };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const response = await fetch(BREVO_EMAIL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      subject,
      htmlContent,
      textContent,
      to: recipients.map((email) => ({ email })),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      reason: data.message || `Brevo respondio con estado ${response.status}.`,
      sent: false,
      status: response.status,
    };
  }

  return {
    messageId: data.messageId,
    sent: true,
  };
};

// Notifica al acudiente cuando coordinacion aprueba o rechaza la excusa.
export const sendMedicalExcuseReviewResult = async ({
  validationCode,
  email,
  qrPayload,
  rejectionReason,
  status,
  studentName,
}) => {
  const isApproved = status === "Aprobada";
  const subject = isApproved
    ? "Excusa medica aprobada"
    : "Excusa medica rechazada";
  const resultText = isApproved
    ? "La excusa medica fue aprobada por coordinacion."
    : "La excusa medica fue rechazada por coordinacion.";

  return sendBrevoEmail({
    htmlContent: buildReviewEmailHtml({
      qrPayload,
      rejectionReason,
      status,
      studentName,
      validationCode,
    }),
    subject,
    textContent: [
      resultText,
      "",
      `Estudiante: ${studentName || "No especificado"}`,
      `Estado: ${status}`,
      isApproved && validationCode ? `Codigo de validacion: ${validationCode}` : "",
      rejectionReason ? `Motivo del rechazo: ${rejectionReason}` : "",
      "",
      "Puedes consultar el detalle en SchoolMed.",
    ]
      .filter(Boolean)
      .join("\n"),
    to: email,
  });
};

// Envia correos manuales desde coordinacion usando Brevo API.
export const sendManualEmail = async ({ body, subject, to }) => {
  return sendBrevoEmail({
    htmlContent: buildManualEmailHtml({ body, subject }),
    subject,
    textContent: body,
    to,
  });
};

export default {
  sendManualEmail,
  sendMedicalExcuseReviewResult,
};
