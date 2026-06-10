import nodemailer from "nodemailer";

// Crea el transporte SMTP usando el proveedor configurado en variables de entorno.
const getTransporter = () => {
  const { SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

// Envia al acudiente el codigo que confirma el envio de una excusa medica.
export const sendMedicalExcuseVerificationCode = async ({ code, email, studentName }) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("SMTP no configurado. Codigo de verificacion:", code);
    return { sent: false, reason: "SMTP no configurado" };
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Codigo de verificacion de excusa medica",
    text: [
      `Tu codigo de verificacion es: ${code}`,
      "",
      `Este codigo confirma el envio de la excusa medica${studentName ? ` de ${studentName}` : ""}.`,
      "Expira en 10 minutos.",
    ].join("\n"),
  });

  return { sent: true };
};

// Notifica al acudiente cuando coordinacion aprueba o rechaza la excusa.
export const sendMedicalExcuseReviewResult = async ({
  email,
  rejectionReason,
  status,
  studentName,
}) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("SMTP no configurado. No se envio resultado de revision.");
    return { sent: false, reason: "SMTP no configurado" };
  }

  const isApproved = status === "Aprobada";
  const subject = isApproved
    ? "Excusa medica aprobada"
    : "Excusa medica rechazada";
  const resultText = isApproved
    ? "La excusa medica fue aprobada por coordinacion."
    : "La excusa medica fue rechazada por coordinacion.";

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text: [
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
  });

  return { sent: true };
};

// Envia correos manuales desde coordinacion usando el mismo proveedor SMTP.
export const sendManualEmail = async ({ body, subject, to }) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("SMTP no configurado. No se envio correo manual.");
    return { sent: false, reason: "SMTP no configurado" };
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: body,
  });

  return { sent: true };
};

export default {
  sendManualEmail,
  sendMedicalExcuseReviewResult,
  sendMedicalExcuseVerificationCode,
};
