import multer from "multer";
import { mkdirSync } from "node:fs";
import { extname, join } from "node:path";

const uploadPath = join(process.cwd(), "uploads");
mkdirSync(uploadPath, { recursive: true });

// Configura almacenamiento local para soportes medicos subidos por acudientes.
const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    const safeExtension = extname(file.originalname || "").toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
    cb(null, uniqueName);
  },
});

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
  storage,
});
