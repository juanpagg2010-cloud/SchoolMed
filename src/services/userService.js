import User from "../models/userModel.js";
import { VALID_ROLES } from "./authService.js";

export const getAllUsers = async ({ role, isActive } = {}) => {
  const filters = {};

  if (role) {
    if (!VALID_ROLES.includes(role)) {
      const error = new Error("Rol invalido. Usa Coordinador, Profesor o Acudiente.");
      error.statusCode = 400;
      throw error;
    }

    filters.role = role;
  }

  if (isActive !== undefined) {
    filters.isActive = isActive === "true" || isActive === true;
  }

  return User.find(filters).sort({ role: 1, name: 1 });
};

export const updateUserById = async (id, payload) => {
  const { name, email, role, phone, isActive } = payload;

  if (role && !VALID_ROLES.includes(role)) {
    const error = new Error("Rol invalido. Usa Coordinador, Profesor o Acudiente.");
    error.statusCode = 400;
    throw error;
  }

  const updates = { name, email, role, phone, isActive };
  Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

  const user = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    const error = new Error("Usuario no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export default {
  getAllUsers,
  updateUserById,
};
