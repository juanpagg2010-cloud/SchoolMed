import { deleteUserById, getAllUsers, updateUserById } from "../services/userService.js";

const getUserId = (user) => user?._id || user?.id;

// Controlador para listar usuarios con filtros opcionales.
export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers(req.query);

    return res.json({
      ok: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudieron consultar los usuarios.",
    });
  }
};

// Controlador para actualizar datos de un usuario.
export const updateUser = async (req, res) => {
  try {
    const user = await updateUserById(req.params.id, req.body, getUserId(req.user));

    return res.json({
      ok: true,
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo actualizar el usuario.",
    });
  }
};

// Controlador para eliminar un usuario registrado.
export const deleteUser = async (req, res) => {
  try {
    const user = await deleteUserById(req.params.id, getUserId(req.user));

    return res.json({
      ok: true,
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo eliminar el usuario.",
    });
  }
};

export default {
  deleteUser,
  getUsers,
  updateUser,
};
