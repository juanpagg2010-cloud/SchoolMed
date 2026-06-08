import nodemailer from "nodemailer";

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

export default {
  sendMedicalExcuseVerificationCode,
};
