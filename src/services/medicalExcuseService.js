import MedicalExcuse from "../models/medicalExcuse.js";
import User from "../models/userModel.js";
import { createActivity } from "./activityService.js";
import { sendMedicalExcuseReviewResult } from "./emailService.js";

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

// Envia el resultado de coordinacion al correo del acudiente sin bloquear la decision.
const notifyGuardianReviewResult = async (excusa) => {
  if (!["Aprobada", "Rechazada"].includes(excusa.estado)) {
    return { sent: false, reason: "Estado no notificable" };
  }

  let guardianEmail = excusa.acudienteId?.email;

  if (!guardianEmail && excusa.acudienteId) {
    const guardian = await User.findById(excusa.acudienteId).select("email");
    guardianEmail = guardian?.email;
  }

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

// Crea la excusa y la envia directamente a revision de coordinacion.
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
    estado: "PendienteRevision",
  });

  const publicExcuse = await MedicalExcuse.findById(excusa._id);

  await createActivity({
    actorId: userId,
    message: `Se radico una excusa para ${nombreEstudiante} y quedo en revision de coordinacion.`,
    metadata: { excuseId: excusa._id, status: excusa.estado },
    type: "Excusa",
  });

  return { excusa: publicExcuse };
};

// Lista las excusas creadas por el acudiente autenticado.
export const getGuardianExcuses = (userId) => {
  return MedicalExcuse.find({ acudienteId: userId }).sort({ createdAt: -1 });
};

// Lista excusas visibles para coordinacion.
export const getCoordinatorExcuses = ({ grado, grupo, estado } = {}) => {
  const filtro = estado ? { estado } : {};

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
  const excusas = await MedicalExcuse.find()
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

  const emailNotification = await notifyGuardianReviewResult(excusa);

  await createActivity({
    actorId: coordinatorId,
    message: `${excusa.nombreEstudiante} fue ${excusa.estado === "Aprobada" ? "aprobada" : "rechazada"} por coordinacion.`,
    metadata: {
      emailNotification,
      excuseId: excusa._id,
      status: excusa.estado,
    },
    type: "Excusa",
  });

  return {
    ...excusa.toObject(),
    emailNotification,
  };
};

export default {
  createMedicalExcuse,
  getGuardianExcuses,
  getCoordinatorExcuses,
  getExcusesGroupedByGrade,
  getTeacherExcuses,
  getMedicalExcuseById,
  reviewMedicalExcuse,
};
