import bcrypt from "bcrypt";
import MedicalExcuse from "../models/medicalExcuse.js";
import {
  sendMedicalExcuseReviewResult,
  sendMedicalExcuseVerificationCode,
} from "./emailService.js";

const VERIFICATION_CODE_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;

// Normaliza los datos del archivo subido para guardarlos dentro de la excusa.
const getUploadedFile = (file) => {
  if (!file) {
    return undefined;
  }

  return {
    nombreOriginal: file.originalname,
    nombreArchivo: file.filename,
    ruta: file.path,
    tipo: file.mimetype,
    tamano: file.size,
  };
};

// Calcula si una excusa aprobada sigue vigente para el docente.
const getValidity = (excuse) => {
  const today = new Date();
  return today <= excuse.fechaFin ? "Activa" : "Vencida";
};

// Genera un codigo numerico de 6 digitos para la verificacion por correo.
const createVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Construye los datos seguros de verificacion que se guardan en MongoDB.
const buildVerification = async (code) => ({
  codigoHash: await bcrypt.hash(code, 10),
  expiraEn: new Date(Date.now() + VERIFICATION_CODE_MINUTES * 60 * 1000),
  intentos: 0,
  verificadoEn: undefined,
  enviadoEn: new Date(),
});

// Garantiza que solo el acudiente propietario pueda verificar o reenviar su codigo.
const ensureOwner = (excusa, userId) => {
  if (String(excusa.acudienteId) !== String(userId)) {
    const error = new Error("No puedes verificar una excusa de otro acudiente.");
    error.statusCode = 403;
    throw error;
  }
};

// Envia el resultado de coordinacion al correo del acudiente sin bloquear la decision.
const notifyGuardianReviewResult = async (excusa) => {
  if (!["Aprobada", "Rechazada"].includes(excusa.estado)) {
    return { sent: false, reason: "Estado no notificable" };
  }

  const guardianEmail = excusa.acudienteId?.email;

  if (!guardianEmail) {
    return { sent: false, reason: "Acudiente sin correo" };
  }

  try {
    return await sendMedicalExcuseReviewResult({
      email: guardianEmail,
      rejectionReason: excusa.motivoRechazo,
      status: excusa.estado,
      studentName: excusa.nombreEstudiante,
    });
  } catch (error) {
    console.error(`No se pudo enviar correo de revision: ${error.message}`);
    return { sent: false, reason: error.message };
  }
};

// Crea la excusa como PendienteVerificacion y envia el codigo al correo del acudiente.
export const createMedicalExcuse = async (userId, userEmail, payload, file) => {
  const {
    nombreEstudiante,
    documentoEstudiante,
    grado,
    grupo,
    motivo,
    descripcion,
    fechaInicio,
    fechaFin,
  } = payload;

  if (!nombreEstudiante || !grado || !fechaInicio || !fechaFin) {
    const error = new Error("Nombre del estudiante, grado, fecha inicio y fecha fin son obligatorios.");
    error.statusCode = 400;
    throw error;
  }

  if (!descripcion && !file) {
    const error = new Error("Debes escribir una descripcion o subir un archivo.");
    error.statusCode = 400;
    throw error;
  }

  if (new Date(fechaFin) < new Date(fechaInicio)) {
    const error = new Error("La fecha final no puede ser anterior a la fecha de inicio.");
    error.statusCode = 400;
    throw error;
  }

  const code = createVerificationCode();
  const excusa = await MedicalExcuse.create({
    acudienteId: userId,
    nombreEstudiante,
    documentoEstudiante,
    grado,
    grupo,
    motivo,
    descripcion,
    archivo: getUploadedFile(file),
    fechaInicio,
    fechaFin,
    estado: "PendienteVerificacion",
    verificacion: await buildVerification(code),
  });

  const emailResult = await sendMedicalExcuseVerificationCode({
    code,
    email: userEmail,
    studentName: nombreEstudiante,
  });

  const publicExcuse = await MedicalExcuse.findById(excusa._id);

  return { excusa: publicExcuse, emailResult };
};

// Lista las excusas creadas por el acudiente autenticado.
export const getGuardianExcuses = (userId) => {
  return MedicalExcuse.find({ acudienteId: userId }).sort({ createdAt: -1 });
};

// Lista excusas visibles para coordinacion; oculta las que aun no verifico el acudiente.
export const getCoordinatorExcuses = ({ grado, grupo, estado } = {}) => {
  const filtro = estado ? { estado } : { estado: { $ne: "PendienteVerificacion" } };

  if (grado) filtro.grado = grado;
  if (grupo) filtro.grupo = grupo.toUpperCase();
  if (estado) filtro.estado = estado;

  return MedicalExcuse.find(filtro)
    .populate("acudienteId", "name email phone")
    .populate("coordinadorId", "name email")
    .sort({ grado: 1, grupo: 1, createdAt: -1 });
};

// Agrupa excusas visibles para coordinacion por grado escolar.
export const getExcusesGroupedByGrade = async () => {
  const excusas = await MedicalExcuse.find({ estado: { $ne: "PendienteVerificacion" } })
    .populate("acudienteId", "name email phone")
    .populate("coordinadorId", "name email")
    .sort({ grado: 1, grupo: 1, createdAt: -1 });

  const grados = excusas.reduce((result, excusa) => {
    result[excusa.grado] = result[excusa.grado] || [];
    result[excusa.grado].push(excusa);
    return result;
  }, {});

  return { excusas, grados };
};

// Devuelve solo excusas aprobadas para consulta docente.
export const getTeacherExcuses = async ({ grado, grupo } = {}) => {
  const filtro = { estado: "Aprobada" };

  if (grado) filtro.grado = grado;
  if (grupo) filtro.grupo = grupo.toUpperCase();

  const excusas = await MedicalExcuse.find(filtro).sort({
    grado: 1,
    grupo: 1,
    fechaFin: 1,
  });

  return excusas.map((excusa) => ({
    ...excusa.toObject(),
    vigencia: getValidity(excusa),
  }));
};

// Consulta una excusa por id con datos basicos del acudiente y coordinador.
export const getMedicalExcuseById = async (id) => {
  const excusa = await MedicalExcuse.findById(id)
    .populate("acudienteId", "name email phone")
    .populate("coordinadorId", "name email");

  if (!excusa) {
    const error = new Error("Excusa medica no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  return excusa;
};

// Aplica la decision del coordinador sobre una excusa ya verificada.
export const reviewMedicalExcuse = async (id, coordinatorId, review) => {
  const currentExcuse = await MedicalExcuse.findById(id);

  if (!currentExcuse) {
    const error = new Error("Excusa medica no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  if (currentExcuse.estado === "PendienteVerificacion") {
    const error = new Error("La excusa aun no fue verificada por el acudiente.");
    error.statusCode = 409;
    throw error;
  }

  const excusa = await MedicalExcuse.findByIdAndUpdate(
    id,
    {
      ...review,
      coordinadorId: coordinatorId,
      fechaRevision: new Date(),
    },
    { new: true, runValidators: true },
  )
    .populate("acudienteId", "name email phone")
    .populate("coordinadorId", "name email");

  if (!excusa) {
    const error = new Error("Excusa medica no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  await notifyGuardianReviewResult(excusa);

  return excusa;
};

// Valida el codigo enviado al correo y mueve la excusa a PendienteRevision.
export const verifyMedicalExcuseCode = async (id, userId, code) => {
  if (!code) {
    const error = new Error("El codigo de verificacion es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  const excusa = await MedicalExcuse.findById(id).select("+verificacion.codigoHash");

  if (!excusa) {
    const error = new Error("Excusa medica no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  ensureOwner(excusa, userId);

  if (excusa.estado !== "PendienteVerificacion") {
    const error = new Error("Esta excusa ya fue verificada o revisada.");
    error.statusCode = 409;
    throw error;
  }

  if (!excusa.verificacion?.codigoHash || !excusa.verificacion?.expiraEn) {
    const error = new Error("La excusa no tiene codigo de verificacion activo.");
    error.statusCode = 409;
    throw error;
  }

  if (excusa.verificacion.expiraEn < new Date()) {
    const error = new Error("El codigo de verificacion expiro. Solicita uno nuevo.");
    error.statusCode = 410;
    throw error;
  }

  if (excusa.verificacion.intentos >= MAX_VERIFICATION_ATTEMPTS) {
    const error = new Error("Superaste el numero maximo de intentos. Solicita un nuevo codigo.");
    error.statusCode = 429;
    throw error;
  }

  const isValidCode = await bcrypt.compare(code, excusa.verificacion.codigoHash);

  if (!isValidCode) {
    excusa.verificacion.intentos += 1;
    await excusa.save();

    const error = new Error("Codigo de verificacion incorrecto.");
    error.statusCode = 401;
    throw error;
  }

  excusa.estado = "PendienteRevision";
  excusa.verificacion.verificadoEn = new Date();
  await excusa.save();

  return getMedicalExcuseById(id);
};

// Genera y envia un nuevo codigo cuando el anterior expiro o se bloqueo.
export const resendMedicalExcuseCode = async (id, userId, userEmail) => {
  const excusa = await MedicalExcuse.findById(id).select("+verificacion.codigoHash");

  if (!excusa) {
    const error = new Error("Excusa medica no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  ensureOwner(excusa, userId);

  if (excusa.estado !== "PendienteVerificacion") {
    const error = new Error("Esta excusa ya fue verificada o revisada.");
    error.statusCode = 409;
    throw error;
  }

  const code = createVerificationCode();
  excusa.verificacion = await buildVerification(code);
  await excusa.save();

  const emailResult = await sendMedicalExcuseVerificationCode({
    code,
    email: userEmail,
    studentName: excusa.nombreEstudiante,
  });

  const publicExcuse = await MedicalExcuse.findById(id);

  return { excusa: publicExcuse, emailResult };
};

export default {
  createMedicalExcuse,
  getGuardianExcuses,
  getCoordinatorExcuses,
  getExcusesGroupedByGrade,
  getTeacherExcuses,
  getMedicalExcuseById,
  reviewMedicalExcuse,
  resendMedicalExcuseCode,
  verifyMedicalExcuseCode,
};
