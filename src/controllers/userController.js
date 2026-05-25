import User from "../models/userModel.js";

const VALID_ROLES = ["Coordinador", "Profesor", "Acudiente"];

const isCoordinator = (user) => user?.role === "Coordinador";

export const getUsers = async (req, res) => {
  try {
    if (!isCoordinator(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un coordinador puede consultar usuarios.",
      });
    }

    const { role, isActive } = req.query;
    const filters = {};

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          ok: false,
          message: "Rol invalido. Usa Coordinador, Profesor o Acudiente.",
        });
      }

      filters.role = role;
    }

    if (isActive !== undefined) {
      filters.isActive = isActive === "true";
    }

    const users = await User.find(filters).sort({ role: 1, name: 1 });

    return res.json({
      ok: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No se pudieron consultar los usuarios.",
      error: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    if (!isCoordinator(req.user)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un coordinador puede actualizar usuarios.",
      });
    }

    const { id } = req.params;
    const { name, email, role, phone, isActive } = req.body;

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        ok: false,
        message: "Rol invalido. Usa Coordinador, Profesor o Acudiente.",
      });
    }

    const updates = { name, email, role, phone, isActive };
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

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
    return res.status(400).json({
      ok: false,
      message: "No se pudo actualizar el usuario.",
      error: error.message,
    });
  }
};

export default {
  getUsers,
  updateUser,
};
