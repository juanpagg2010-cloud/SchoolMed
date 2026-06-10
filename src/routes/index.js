import { Router } from "express";
import activityRoutes from "./activityRoutes.js";
import authRoutes from "./authRoutes.js";
import emailRoutes from "./emailRoutes.js";
import gradeRoutes from "./gradeRoutes.js";
import medicalExcuseRoutes from "./medicalExcuseRoutes.js";
import userRoutes from "./userRoutes.js";

const router = Router();

// Agrupa las rutas por dominio para montarlas desde /api y /api/v1.
router.use("/auth", authRoutes);
router.use("/activities", activityRoutes);
router.use("/emails", emailRoutes);
router.use("/grades", gradeRoutes);
router.use("/users", userRoutes);
router.use("/medical-excuses", medicalExcuseRoutes);

export default router;
