import { getAllUsers, updateUserById } from "../services/userService.js";

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

export const updateUser = async (req, res) => {
  try {
    const user = await updateUserById(req.params.id, req.body);

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

export default {
  getUsers,
  updateUser,
};
