export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "No autenticado.",
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      ok: false,
      message: "No tienes permisos para realizar esta accion.",
    });
  }

  return next();
};

export default authorizeRoles;
