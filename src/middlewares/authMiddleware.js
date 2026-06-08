import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        ok: false,
        message: "Codigo de autenticacion requerido.",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        ok: false,
        message: "JWT_SECRET no esta configurado.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        ok: false,
        message: "Sesion invalida o usuario desactivado.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "Codigo invalido o expirado.",
      error: error.message,
    });
  }
};

export default protect;
