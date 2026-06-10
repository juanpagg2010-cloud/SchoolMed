import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import * as activityService from "../services/activityService.js";

const router = Router();
const COORDINATOR = "Coordinador";
const TEACHER = "Profesor";

router.use(protect);

// Movimientos recientes para paneles administrativos y docentes.
router.get("/", authorizeRoles(COORDINATOR, TEACHER), async (req, res) => {
  try {
    const activities = await activityService.getRecentActivities(req.query);
    res.status(200).json({ ok: true, total: activities.length, activities });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar los movimientos.",
    });
  }
});

export default router;
