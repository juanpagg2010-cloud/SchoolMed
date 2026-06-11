import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { uploadFaceCapture } from "../middlewares/uploadMiddleware.js";
import * as faceService from "../services/faceService.js";

const router = Router();
const GUARDIAN = "Acudiente";
const getUserId = (user) => user?._id || user?.id;

router.use(protect);
router.use(authorizeRoles(GUARDIAN));

router.get("/status", async (req, res) => {
  try {
    const status = await faceService.getFaceStatus(getUserId(req.user));

    res.status(200).json({
      ok: true,
      status,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudo consultar el estado biometrico.",
    });
  }
});

router.post("/register", uploadFaceCapture.single("faceImage"), async (req, res) => {
  try {
    const result = await faceService.registerGuardianFace(getUserId(req.user), req.file);

    res.status(200).json({
      ok: true,
      message: "Datos biometricos faciales registrados correctamente.",
      user: result.user,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo registrar el rostro.",
    });
  }
});

router.post("/verify", uploadFaceCapture.single("faceImage"), async (req, res) => {
  try {
    const verification = await faceService.verifyGuardianFace(getUserId(req.user), req.file);

    res.status(200).json({
      ok: true,
      message: "Identidad biometrica confirmada.",
      verification,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo validar la identidad facial.",
    });
  }
});

export default router;
