// Respuesta uniforme para endpoints que no existen.
export const notFound = (req, res) => {
  res.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${req.originalUrl}`,
  });
};

// Manejador final para errores que llegan por next(error).
export const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    ok: false,
    message: error.message || "Error interno del servidor.",
  });
};
