import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/userModel.js";

const VALID_ROLES = ["Coordinador", "Profesor", "Acudiente"];
const getUserId = (user) => user?._id || user?.id;

const createToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET no esta configurado");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
};

const sendAuthResponse = (res, statusCode, user) => {
  const token = createToken(user);
  const userData = user.toObject();
  delete userData.password;

  return res.status(statusCode).json({
    ok: true,
    token,
    user: userData,
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role = "Acudiente", phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        ok: false,
        message: "Nombre, correo, contrasena y telefono son obligatorios.",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        ok: false,
        message: "Rol invalido. Usa Coordinador, Profesor o Acudiente.",
      });
    }

    const userExists = await User.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
    });

    if (userExists) {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un usuario con ese correo o telefono.",
      });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: encryptedPassword,
      role,
      phone,
    });

    return sendAuthResponse(res, 201, user);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "No se pudo registrar el usuario.",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Correo y contrasena son obligatorios.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales incorrectas.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        ok: false,
        message: "El usuario esta desactivado.",
      });
    }

    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No se pudo iniciar sesion.",
      error: error.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = getUserId(req.user);

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado.",
      });
    }

    return res.json({
      ok: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No se pudo consultar el perfil.",
      error: error.message,
    });
  }
};

export default {
  register,
  login,
  getProfile,
};
