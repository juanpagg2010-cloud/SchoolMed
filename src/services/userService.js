import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import { createActivity } from "./activityService.js";
import { VALID_ROLES } from "./authService.js";

const removePassword = (user) => {
  const userData = user.toObject();
  delete userData.password;
  return userData;
};

// Crea usuarios desde el panel de coordinacion con contrasena inicial definida por el admin.
export const createUserByAdmin = async ({ name, email, password, role, phone }, actorId) => {
  if (!name || !email || !password || !role || !phone) {
    const error = new Error("Nombre, correo, contrasena, rol y telefono son obligatorios.");
    error.statusCode = 400;
    throw error;
  }

  if (!VALID_ROLES.includes(role)) {
    const error = new Error("Rol invalido. Usa Coordinador, Profesor o Acudiente.");
    error.statusCode = 400;
    throw error;
  }

  const userExists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }],
  });

  if (userExists) {
    const error = new Error("Ya existe un usuario con ese correo o telefono.");
    error.statusCode = 409;
    throw error;
  }

  const encryptedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: encryptedPassword,
    role,
    phone,
  });

  await createActivity({
    actorId,
    message: `${user.name} fue creado como ${user.role}.`,
    metadata: { role: user.role, userId: user._id },
    type: "Usuario",
  });

  return removePassword(user);
};

// Lista usuarios con filtros opcionales por rol y estado.
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

// Actualiza datos administrativos de un usuario.
export const updateUserById = async (id, payload, actorId) => {
  const { name, email, role, phone, isActive } = payload;

  if (role && !VALID_ROLES.includes(role)) {
    const error = new Error("Rol invalido. Usa Coordinador, Profesor o Acudiente.");
    error.statusCode = 400;
    throw error;
  }

  if (actorId && String(actorId) === String(id) && isActive === false) {
    const error = new Error("No puedes deshabilitar tu propia cuenta.");
    error.statusCode = 400;
    throw error;
  }

  const updates = {
    name,
    email: email ? email.toLowerCase() : email,
    role,
    phone,
    isActive,
  };
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

  await createActivity({
    actorId,
    message: `${user.name} fue actualizado${isActive === false ? " y deshabilitado" : isActive === true ? " y habilitado" : ""}.`,
    metadata: { role: user.role, userId: user._id },
    type: "Usuario",
  });

  return user;
};

// Elimina un usuario registrado desde el panel administrativo.
export const deleteUserById = async (id, actorId) => {
  if (actorId && String(actorId) === String(id)) {
    const error = new Error("No puedes eliminar tu propia cuenta.");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    const error = new Error("Usuario no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await createActivity({
    actorId,
    message: `${user.name} fue eliminado del sistema.`,
    metadata: { role: user.role, userId: user._id },
    type: "Usuario",
  });

  return removePassword(user);
};

export default {
  createUserByAdmin,
  deleteUserById,
  getAllUsers,
  updateUserById,
};
