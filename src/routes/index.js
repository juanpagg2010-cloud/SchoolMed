import { Router } from "express";
import authRoutes from "./authRoutes.js";
import medicalExcuseRoutes from "./medicalExcuseRoutes.js";
import userRoutes from "./userRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/medical-excuses", medicalExcuseRoutes);

export default router;
