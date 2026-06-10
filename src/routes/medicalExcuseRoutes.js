import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { uploadMedicalSupport } from "../middlewares/uploadMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";
import * as medicalExcuseService from "../services/medicalExcuseService.js";

const router = Router();
const GUARDIAN = "Acudiente";
const TEACHER = "Profesor";
const COORDINATOR = "Coordinador";

const getUserId = (user) => user?._id || user?.id;
const isGuardian = (user) => user?.role === GUARDIAN;

const canReadExcuse = (user, excuse) => {
  if (!isGuardian(user)) return true;

  const ownerId = excuse.acudienteId?._id || excuse.acudienteId;
  return String(ownerId) === String(getUserId(user));
};

router.use(protect);

// Ruta para crear una excusa medica. Solo acudientes.
router.post("/", authorizeRoles(GUARDIAN), uploadMedicalSupport.single("archivo"), async (req, res) => {
  try {
    const { excusa } = await medicalExcuseService.createMedicalExcuse(
      getUserId(req.user),
      req.user.email,
      req.body,
      req.file,
    );

    res.status(201).json({
      ok: true,
      message: "Excusa medica creada y enviada a coordinacion para revision.",
      excusa,
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo crear la excusa medica.",
    });
  }
});

// Ruta para consultar las excusas del acudiente autenticado.
router.get("/me", authorizeRoles(GUARDIAN), async (req, res) => {
  try {
    const excusas = await medicalExcuseService.getGuardianExcuses(getUserId(req.user));
    res.status(200).json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar tus excusas.",
    });
  }
});

// Alias para consultar las excusas del acudiente autenticado.
router.get("/mine", authorizeRoles(GUARDIAN), async (req, res) => {
  try {
    const excusas = await medicalExcuseService.getGuardianExcuses(getUserId(req.user));
    res.status(200).json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar tus excusas.",
    });
  }
});

// Ruta para listar excusas pendientes de revision institucional. Solo coordinadores.
router.get("/review", authorizeRoles(COORDINATOR), async (req, res) => {
  try {
    const excusas = await medicalExcuseService.getCoordinatorExcuses(req.query);
    res.status(200).json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar las excusas medicas.",
    });
  }
});

// Ruta para organizar las excusas por grado. Solo coordinadores.
router.get("/review/by-grade", authorizeRoles(COORDINATOR), async (req, res) => {
  try {
    const { excusas, grados } = await medicalExcuseService.getExcusesGroupedByGrade();
    res.status(200).json({
      ok: true,
      total: excusas.length,
      grados,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron organizar las excusas por grado.",
    });
  }
});

// Alias para listar excusas desde coordinacion.
router.get("/coordinator", authorizeRoles(COORDINATOR), async (req, res) => {
  try {
    const excusas = await medicalExcuseService.getCoordinatorExcuses(req.query);
    res.status(200).json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar las excusas medicas.",
    });
  }
});

// Alias para organizar excusas por grado.
router.get("/by-grade", authorizeRoles(COORDINATOR), async (req, res) => {
  try {
    const { excusas, grados } = await medicalExcuseService.getExcusesGroupedByGrade();
    res.status(200).json({
      ok: true,
      total: excusas.length,
      grados,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron organizar las excusas por grado.",
    });
  }
});

// Ruta para consultar excusas aprobadas desde el salon. Profesores y coordinadores.
router.get("/classroom", authorizeRoles(TEACHER, COORDINATOR), async (req, res) => {
  try {
    const excusas = await medicalExcuseService.getTeacherExcuses(req.query);
    res.status(200).json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar las excusas para profesores.",
    });
  }
});

// Alias para consultar excusas aprobadas desde el rol docente.
router.get("/teacher", authorizeRoles(TEACHER, COORDINATOR), async (req, res) => {
  try {
    const excusas = await medicalExcuseService.getTeacherExcuses(req.query);
    res.status(200).json({
      ok: true,
      total: excusas.length,
      excusas,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar las excusas para profesores.",
    });
  }
});

// Ruta para validar una excusa aprobada por codigo o QR. Solo coordinadores.
router.get("/validate/:code", authorizeRoles(COORDINATOR), async (req, res) => {
  try {
    const excusa = await medicalExcuseService.getApprovedExcuseByValidationCode(req.params.code);

    return res.status(200).json({
      ok: true,
      accepted: true,
      message: "Excusa medica aceptada y verificada.",
      excusa,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      ok: false,
      accepted: false,
      message: err.message || "No aparece una excusa medica aceptada con ese codigo.",
    });
  }
});

// Ruta para aprobar una excusa medica. Solo coordinadores.
router.patch("/:id/approve", authorizeRoles(COORDINATOR), validateObjectId("id"), async (req, res) => {
  try {
    const excusa = await medicalExcuseService.reviewMedicalExcuse(req.params.id, getUserId(req.user), {
      estado: "Aprobada",
      motivoRechazo: "",
      motivoCancelacion: "",
    });

    res.status(200).json({
      ok: true,
      emailNotification: excusa.emailNotification,
      emailSent: Boolean(excusa.emailNotification?.sent),
      message: "Excusa medica aprobada.",
      excusa,
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo aprobar la excusa medica.",
    });
  }
});

// Ruta para rechazar una excusa medica. Solo coordinadores.
router.patch("/:id/reject", authorizeRoles(COORDINATOR), validateObjectId("id"), async (req, res) => {
  try {
    if (!req.body.motivoRechazo) {
      return res.status(400).json({
        ok: false,
        message: "Debes escribir el motivo del rechazo.",
      });
    }

    const excusa = await medicalExcuseService.reviewMedicalExcuse(req.params.id, getUserId(req.user), {
      estado: "Rechazada",
      motivoRechazo: req.body.motivoRechazo,
    });

    return res.status(200).json({
      ok: true,
      emailNotification: excusa.emailNotification,
      emailSent: Boolean(excusa.emailNotification?.sent),
      message: "Excusa medica rechazada.",
      excusa,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo rechazar la excusa medica.",
    });
  }
});

// Ruta para cancelar una excusa medica. Solo coordinadores.
router.patch("/:id/cancel", authorizeRoles(COORDINATOR), validateObjectId("id"), async (req, res) => {
  try {
    if (!req.body.motivoCancelacion) {
      return res.status(400).json({
        ok: false,
        message: "Debes escribir el motivo de la cancelacion.",
      });
    }

    const excusa = await medicalExcuseService.reviewMedicalExcuse(req.params.id, getUserId(req.user), {
      estado: "Cancelada",
      motivoCancelacion: req.body.motivoCancelacion,
    });

    return res.status(200).json({
      ok: true,
      message: "Excusa medica cancelada.",
      excusa,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo cancelar la excusa medica.",
    });
  }
});

// Ruta para consultar una excusa por id.
router.get("/:id", validateObjectId("id"), async (req, res) => {
  try {
    const excusa = await medicalExcuseService.getMedicalExcuseById(req.params.id);

    if (!canReadExcuse(req.user, excusa)) {
      return res.status(403).json({
        ok: false,
        message: "No puedes consultar una excusa de otro acudiente.",
      });
    }

    return res.status(200).json({
      ok: true,
      excusa,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudo consultar la excusa medica.",
    });
  }
});

export default router;
