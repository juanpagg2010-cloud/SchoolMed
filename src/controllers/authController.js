import {
  createToken,
  getUserProfile,
  loginUser,
  registerUser,
  removePassword,
} from "../services/authService.js";

const getUserId = (user) => user?._id || user?.id;

// Estandariza la respuesta de autenticacion con token y usuario sin contrasena.
const sendAuthResponse = (res, statusCode, user) => {
  const token = createToken(user);

  return res.status(statusCode).json({
    ok: true,
    token,
    user: removePassword(user),
  });
};

// Controlador para registrar usuarios.
export const register = async (req, res) => {
  try {
    const user = await registerUser(req.body);
    return sendAuthResponse(res, 201, user);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo registrar el usuario.",
    });
  }
};

// Controlador para iniciar sesion.
export const login = async (req, res) => {
  try {
    const user = await loginUser(req.body);
    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudo iniciar sesion.",
    });
  }
};

// Controlador para consultar el perfil del usuario autenticado.
export const getProfile = async (req, res) => {
  try {
    const userId = getUserId(req.user);

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado.",
      });
    }

    const user = await getUserProfile(userId);

    return res.json({
      ok: true,
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudo consultar el perfil.",
    });
  }
};

export default {
  register,
  login,
  getProfile,
};
