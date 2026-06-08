import { isValidObjectId } from "mongoose";

const validateObjectId =
  (paramName = "id") =>
  (req, res, next) => {
    if (!isValidObjectId(req.params[paramName])) {
      return res.status(400).json({
        ok: false,
        message: "Identificador invalido.",
      });
    }

    return next();
  };

export default validateObjectId;
