import {
  createMedicalExcuse,
  getCoordinatorExcuses,
  getExcusesGroupedByGrade,
  getGuardianExcuses,
  getMedicalExcuseById,
  getTeacherExcuses,
  reviewMedicalExcuse,
} from "../services/medicalExcuseService.js";

const isGuardian = (user) => user?.role === "Acudiente";
const getUserId = (user) => user?._id || user?.id;

// Controlador para crear una excusa y enviarla directamente a coordinacion.
export const crearExcusaMedica = async (req, res) => {
  try {
    const { excusa } = await createMedicalExcuse(
      getUserId(req.user),
      req.user.email,
      req.body,
      req.file,
    );

    return res.status(201).json({
      ok: true,
      message: "Excusa medica creada y enviada a coordinacion para revision.",
      excusa,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo crear la excusa medica.",
    });
  }
};

// Controlador para listar las excusas del acudiente autenticado.
export const obtenerMisExcusas = async (req, res) => {
  try {
    const excusas = await getGuardianExcuses(getUserId(req.user));

    return res.json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudieron consultar tus excusas.",
    });
  }
};

// Controlador para listar excusas visibles para coordinacion.
export const obtenerExcusasParaCoordinador = async (req, res) => {
  try {
    const excusas = await getCoordinatorExcuses(req.query);

    return res.json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudieron consultar las excusas medicas.",
    });
  }
};

// Controlador para agrupar excusas por grado escolar.
export const obtenerExcusasPorGrado = async (req, res) => {
  try {
    const { excusas, grados } = await getExcusesGroupedByGrade();

    return res.json({
      ok: true,
      total: excusas.length,
      grados,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudieron organizar las excusas por grado.",
    });
  }
};

// Controlador para listar excusas aprobadas disponibles para docentes.
export const obtenerExcusasParaProfesor = async (req, res) => {
  try {
    const excusas = await getTeacherExcuses(req.query);

    return res.json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudieron consultar las excusas para profesores.",
    });
  }
};

// Controlador para consultar una excusa especifica.
export const obtenerExcusaPorId = async (req, res) => {
  try {
    const excusa = await getMedicalExcuseById(req.params.id);
    const ownerId = excusa.acudienteId?._id || excusa.acudienteId;

    if (isGuardian(req.user) && String(ownerId) !== String(getUserId(req.user))) {
      return res.status(403).json({
        ok: false,
        message: "No puedes consultar una excusa de otro acudiente.",
      });
    }

    return res.json({
      ok: true,
      excusa,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudo consultar la excusa medica.",
    });
  }
};

// Controlador para aprobar una excusa revisada.
export const aprobarExcusa = async (req, res) => {
  try {
    const excusa = await reviewMedicalExcuse(req.params.id, getUserId(req.user), {
      estado: "Aprobada",
      motivoRechazo: "",
      motivoCancelacion: "",
    });

    return res.json({
      ok: true,
      message: "Excusa medica aprobada.",
      excusa,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo aprobar la excusa medica.",
    });
  }
};

// Controlador para rechazar una excusa revisada.
export const rechazarExcusa = async (req, res) => {
  try {
    const { motivoRechazo } = req.body;

    if (!motivoRechazo) {
      return res.status(400).json({
        ok: false,
        message: "Debes escribir el motivo del rechazo.",
      });
    }

    const excusa = await reviewMedicalExcuse(req.params.id, getUserId(req.user), {
      estado: "Rechazada",
      motivoRechazo,
    });

    return res.json({
      ok: true,
      message: "Excusa medica rechazada.",
      excusa,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo rechazar la excusa medica.",
    });
  }
};

// Controlador para cancelar una excusa revisada.
export const cancelarExcusa = async (req, res) => {
  try {
    const { motivoCancelacion } = req.body;

    if (!motivoCancelacion) {
      return res.status(400).json({
        ok: false,
        message: "Debes escribir el motivo de la cancelacion.",
      });
    }

    const excusa = await reviewMedicalExcuse(req.params.id, getUserId(req.user), {
      estado: "Cancelada",
      motivoCancelacion,
    });

    return res.json({
      ok: true,
      message: "Excusa medica cancelada.",
      excusa,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo cancelar la excusa medica.",
    });
  }
};

export default {
  crearExcusaMedica,
  obtenerMisExcusas,
  obtenerExcusasParaCoordinador,
  obtenerExcusasPorGrado,
  obtenerExcusasParaProfesor,
  obtenerExcusaPorId,
  aprobarExcusa,
  rechazarExcusa,
  cancelarExcusa,
};
