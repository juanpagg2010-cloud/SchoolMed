// Envuelve controladores async para enviar errores a Express sin repetir try/catch.
const asyncHandler = (controller) => (req, res, next) => {
  Promise.resolve(controller(req, res, next)).catch(next);
};

export default asyncHandler;
