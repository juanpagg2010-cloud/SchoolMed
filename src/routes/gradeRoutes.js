import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";
import * as gradeService from "../services/gradeService.js";

const router = Router();
const COORDINATOR = "Coordinador";
const TEACHER = "Profesor";

const getUserId = (user) => user?._id || user?.id;

router.use(protect);

// Lista grados para coordinadores y profesores.
router.get("/", authorizeRoles(COORDINATOR, TEACHER), async (req, res) => {
  try {
    const grades = await gradeService.getGrades();
    res.status(200).json({ ok: true, total: grades.length, grades });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar los grados.",
    });
  }
});

// Crea grados desde coordinacion.
router.post("/", authorizeRoles(COORDINATOR), async (req, res) => {
  try {
    const grade = await gradeService.createGrade(req.body, getUserId(req.user));
    res.status(201).json({ ok: true, grade });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo crear el grado.",
    });
  }
});

// Actualiza grados desde coordinacion.
router.patch("/:id", authorizeRoles(COORDINATOR), validateObjectId("id"), async (req, res) => {
  try {
    const grade = await gradeService.updateGrade(req.params.id, req.body, getUserId(req.user));
    res.status(200).json({ ok: true, grade });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo actualizar el grado.",
    });
  }
});

// Elimina grados desde coordinacion.
router.delete("/:id", authorizeRoles(COORDINATOR), validateObjectId("id"), async (req, res) => {
  try {
    const grade = await gradeService.deleteGrade(req.params.id, getUserId(req.user));
    res.status(200).json({ ok: true, grade });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo eliminar el grado.",
    });
  }
});

export default router;
