import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const VALID_ROLES = ["Coordinador", "Profesor", "Acudiente"];

// Genera el JWT usado por el cliente para acceder a rutas protegidas.
export const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET no esta configurado");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
};

// Limpia la contrasena antes de devolver datos del usuario al cliente.
export const removePassword = (user) => {
  const userData = user.toObject();
  delete userData.password;
  return userData;
};

// Registra usuarios validando campos, roles y duplicados.
export const registerUser = async ({ name, email, password, role = "Acudiente", phone }) => {
  if (!name || !email || !password || !phone) {
    const error = new Error("Nombre, correo, contrasena y telefono son obligatorios.");
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

  return User.create({
    name,
    email,
    password: encryptedPassword,
    role,
    phone,
  });
};

// Valida credenciales y estado del usuario antes de iniciar sesion.
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("Correo y contrasena son obligatorios.");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error("Credenciales incorrectas.");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("El usuario esta desactivado.");
    error.statusCode = 403;
    throw error;
  }

  return user;
};

// Consulta el perfil del usuario autenticado.
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("Usuario no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export default {
  createToken,
  removePassword,
  registerUser,
  loginUser,
  getUserProfile,
};
