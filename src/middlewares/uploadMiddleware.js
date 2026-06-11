import multer from "multer";
import { extname } from "node:path";

export const buildStoredFilename = (originalName = "") => {
  const safeExtension = extname(originalName || "").toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
};

// Limita formatos comunes de soportes: imagenes y PDF.
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Solo se permiten archivos PDF, JPG, PNG o WEBP."));
    return;
  }

  cb(null, true);
};

export const uploadMedicalSupport = multer({
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
});

const faceFileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("La captura facial debe ser JPG, PNG o WEBP."));
    return;
  }

  cb(null, true);
};

export const uploadFaceCapture = multer({
  fileFilter: faceFileFilter,
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
});
