import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";
import * as userService from "../services/userService.js";

const router = Router();
const COORDINATOR = "Coordinador";
const getUserId = (user) => user?._id || user?.id;

router.use(protect);
router.use(authorizeRoles(COORDINATOR));

// Ruta para crear usuarios desde coordinacion. El admin define la contrasena inicial.
router.post("/", async (req, res) => {
  try {
    const user = await userService.createUserByAdmin(req.body, getUserId(req.user));
    res.status(201).json({ ok: true, user });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo crear el usuario.",
    });
  }
});

// Ruta para listar usuarios. Solo coordinadores.
router.get("/", async (req, res) => {
  try {
    const users = await userService.getAllUsers(req.query);
    res.status(200).json({
      ok: true,
      count: users.length,
      users,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      ok: false,
      message: err.message || "No se pudieron consultar los usuarios.",
    });
  }
});

// Ruta para actualizar un usuario. Solo coordinadores.
router.patch("/:id", validateObjectId("id"), async (req, res) => {
  try {
    const user = await userService.updateUserById(req.params.id, req.body);
    res.status(200).json({ ok: true, user });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo actualizar el usuario.",
    });
  }
});

export default router;
