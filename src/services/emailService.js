const BREVO_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

const getBrevoConfig = () => {
  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } = process.env;

  return {
    apiKey: BREVO_API_KEY,
    senderEmail: BREVO_SENDER_EMAIL,
    senderName: BREVO_SENDER_NAME || "SchoolMed",
  };
};

const sendBrevoEmail = async ({ subject, textContent, to }) => {
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
  email,
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
    subject,
    textContent: [
      resultText,
      "",
      `Estudiante: ${studentName || "No especificado"}`,
      `Estado: ${status}`,
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
    subject,
    textContent: body,
    to,
  });
};

export default {
  sendManualEmail,
  sendMedicalExcuseReviewResult,
};
