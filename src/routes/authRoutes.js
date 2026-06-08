import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createToken,
  getUserProfile,
  loginUser,
  registerUser,
  removePassword,
} from "../services/authService.js";

const router = Router();

const getUserId = (user) => user?._id || user?.id;

const sendAuthResponse = (res, statusCode, user) => {
  res.status(statusCode).json({
    ok: true,
    token: createToken(user),
    user: removePassword(user),
  });
};

// Ruta para registrar un usuario.
router.post("/register", async (req, res) => {
  try {
    const user = await registerUser(req.body);
    sendAuthResponse(res, 201, user);
  } catch (err) {
    res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo registrar el usuario.",
    });
  }
});

// Ruta para iniciar sesion.
router.post("/login", async (req, res) => {
  try {
    const user = await loginUser(req.body);
    sendAuthResponse(res, 200, user);
  } catch (err) {
    res.status(err.statusCode || 401).json({
      ok: false,
      message: err.message || "No se pudo iniciar sesion.",
    });
  }
});

// Ruta para consultar el usuario autenticado.
router.get("/me", protect, async (req, res) => {
  try {
    const user = await getUserProfile(getUserId(req.user));
    res.status(200).json({ ok: true, user });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudo consultar el perfil.",
    });
  }
});

// Alias para compatibilidad con clientes existentes.
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await getUserProfile(getUserId(req.user));
    res.status(200).json({ ok: true, user });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudo consultar el perfil.",
    });
  }
});

export default router;
