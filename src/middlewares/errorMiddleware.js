// Respuesta uniforme para endpoints que no existen.
export const notFound = (req, res) => {
  res.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${req.originalUrl}`,
  });
};

// Manejador final para errores que llegan por next(error).
export const errorHandler = (error, req, res, next) => {
  const isMulterError = error.name === "MulterError";
  const statusCode = error.statusCode
    || (isMulterError ? 400 : null)
    || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const message = isMulterError && error.code === "LIMIT_FILE_SIZE"
    ? "El archivo no puede pesar mas de 5 MB."
    : error.message || "Error interno del servidor.";

  res.status(statusCode).json({
    ok: false,
    message,
  });
};
