import MedicalExcuse from "../models/medicalExcuse.js";

const isCoordinator = (user) => user?.role === "Coordinador";
const isGuardian = (user) => user?.role === "Acudiente";
const isTeacher = (user) => user?.role === "Profesor";
const getUserId = (user) => user?._id || user?.id;

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

const getValidity = (excuse) => {
  const today = new Date();
  return today <= excuse.fechaFin ? "Activa" : "Vencida";
};

export const crearExcusaMedica = async (req, res) => {
  try {
    if (!isGuardian(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un acudiente puede crear excusas medicas.",
      });
    }

    const {
      nombreEstudiante,
      documentoEstudiante,
      grado,
      grupo,
      motivo,
      descripcion,
      fechaInicio,
      fechaFin,
    } = req.body;

    if (!nombreEstudiante || !grado || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        message: "Nombre del estudiante, grado, fecha inicio y fecha fin son obligatorios.",
      });
    }

    if (!descripcion && !req.file) {
      return res.status(400).json({
        ok: false,
        message: "Debes escribir una descripcion o subir un archivo.",
      });
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
      return res.status(400).json({
        ok: false,
        message: "La fecha final no puede ser anterior a la fecha de inicio.",
      });
    }

    const excusa = await MedicalExcuse.create({
      acudienteId: getUserId(req.user),
      nombreEstudiante,
      documentoEstudiante,
      grado,
      grupo,
      motivo,
      descripcion,
      archivo: getUploadedFile(req.file),
      fechaInicio,
      fechaFin,
    });

    return res.status(201).json({
      ok: true,
      message: "Excusa medica enviada correctamente.",
      excusa,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "No se pudo crear la excusa medica.",
      error: error.message,
    });
  }
};

export const obtenerMisExcusas = async (req, res) => {
  try {
    if (!isGuardian(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un acudiente puede consultar sus excusas.",
      });
    }

    const excusas = await MedicalExcuse.find({ acudienteId: getUserId(req.user) }).sort({
      createdAt: -1,
    });

    return res.json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No se pudieron consultar tus excusas.",
      error: error.message,
    });
  }
};

export const obtenerExcusasParaCoordinador = async (req, res) => {
  try {
    if (!isCoordinator(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un coordinador puede consultar todas las excusas.",
      });
    }

    const { grado, grupo, estado } = req.query;
    const filtro = {};

    if (grado) filtro.grado = grado;
    if (grupo) filtro.grupo = grupo.toUpperCase();
    if (estado) filtro.estado = estado;

    const excusas = await MedicalExcuse.find(filtro)
      .populate("acudienteId", "name email phone")
      .populate("coordinadorId", "name email")
      .sort({ grado: 1, grupo: 1, createdAt: -1 });

    return res.json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No se pudieron consultar las excusas medicas.",
      error: error.message,
    });
  }
};

export const obtenerExcusasPorGrado = async (req, res) => {
  try {
    if (!isCoordinator(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un coordinador puede ver las excusas por grado.",
      });
    }

    const excusas = await MedicalExcuse.find()
      .populate("acudienteId", "name email phone")
      .populate("coordinadorId", "name email")
      .sort({ grado: 1, grupo: 1, createdAt: -1 });

    const grados = excusas.reduce((result, excusa) => {
      const grado = excusa.grado;
      result[grado] = result[grado] || [];
      result[grado].push(excusa);
      return result;
    }, {});

    return res.json({
      ok: true,
      total: excusas.length,
      grados,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No se pudieron organizar las excusas por grado.",
      error: error.message,
    });
  }
};

export const obtenerExcusasParaProfesor = async (req, res) => {
  try {
    if (!isTeacher(req.user) && !isCoordinator(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo profesores o coordinadores pueden consultar excusas.",
      });
    }

    const { grado, grupo } = req.query;
    const filtro = { estado: "Aprobada" };

    if (grado) filtro.grado = grado;
    if (grupo) filtro.grupo = grupo.toUpperCase();

    const excusas = await MedicalExcuse.find(filtro).sort({
      grado: 1,
      grupo: 1,
      fechaFin: 1,
    });

    const excusasConVigencia = excusas.map((excusa) => ({
      ...excusa.toObject(),
      vigencia: getValidity(excusa),
    }));

    return res.json({
      ok: true,
      total: excusasConVigencia.length,
      excusas: excusasConVigencia,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No se pudieron consultar las excusas para profesores.",
      error: error.message,
    });
  }
};

export const obtenerExcusaPorId = async (req, res) => {
  try {
    const excusa = await MedicalExcuse.findById(req.params.id)
      .populate("acudienteId", "name email phone")
      .populate("coordinadorId", "name email");

    if (!excusa) {
      return res.status(404).json({
        ok: false,
        message: "Excusa medica no encontrada.",
      });
    }

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
    return res.status(500).json({
      ok: false,
      message: "No se pudo consultar la excusa medica.",
      error: error.message,
    });
  }
};

export const aprobarExcusa = async (req, res) => {
  try {
    if (!isCoordinator(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un coordinador puede aprobar excusas.",
      });
    }

    const excusa = await MedicalExcuse.findByIdAndUpdate(
      req.params.id,
      {
        estado: "Aprobada",
        coordinadorId: getUserId(req.user),
        fechaRevision: new Date(),
        motivoRechazo: "",
        motivoCancelacion: "",
      },
      { new: true, runValidators: true },
    );

    if (!excusa) {
      return res.status(404).json({
        ok: false,
        message: "Excusa medica no encontrada.",
      });
    }

    return res.json({
      ok: true,
      message: "Excusa medica aprobada.",
      excusa,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "No se pudo aprobar la excusa medica.",
      error: error.message,
    });
  }
};

export const rechazarExcusa = async (req, res) => {
  try {
    if (!isCoordinator(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un coordinador puede rechazar excusas.",
      });
    }

    const { motivoRechazo } = req.body;

    if (!motivoRechazo) {
      return res.status(400).json({
        ok: false,
        message: "Debes escribir el motivo del rechazo.",
      });
    }

    const excusa = await MedicalExcuse.findByIdAndUpdate(
      req.params.id,
      {
        estado: "Rechazada",
        coordinadorId: getUserId(req.user),
        fechaRevision: new Date(),
        motivoRechazo,
      },
      { new: true, runValidators: true },
    );

    if (!excusa) {
      return res.status(404).json({
        ok: false,
        message: "Excusa medica no encontrada.",
      });
    }

    return res.json({
      ok: true,
      message: "Excusa medica rechazada.",
      excusa,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "No se pudo rechazar la excusa medica.",
      error: error.message,
    });
  }
};

export const cancelarExcusa = async (req, res) => {
  try {
    if (!isCoordinator(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un coordinador puede cancelar excusas.",
      });
    }

    const { motivoCancelacion } = req.body;

    if (!motivoCancelacion) {
      return res.status(400).json({
        ok: false,
        message: "Debes escribir el motivo de la cancelacion.",
      });
    }

    const excusa = await MedicalExcuse.findByIdAndUpdate(
      req.params.id,
      {
        estado: "Cancelada",
        coordinadorId: getUserId(req.user),
        fechaRevision: new Date(),
        motivoCancelacion,
      },
      { new: true, runValidators: true },
    );

    if (!excusa) {
      return res.status(404).json({
        ok: false,
        message: "Excusa medica no encontrada.",
      });
    }

    return res.json({
      ok: true,
      message: "Excusa medica cancelada.",
      excusa,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "No se pudo cancelar la excusa medica.",
      error: error.message,
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
