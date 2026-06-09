import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/authRoutes.js";
import medicalExcuseRoutes from "./routes/medicalExcuseRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/schoolmed";
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientPath = join(__dirname, "..", "client");

app.use(cors());
app.use(express.json());
app.use(express.static(clientPath));

app.use("/api/auth", authRoutes);
app.use("/api/medical-excuses", medicalExcuseRoutes);
app.use("/api/users", userRoutes);

app.get("/", (_req, res) => {
  res.sendFile(join(clientPath, "index.html"));
});

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    message: "Ruta no encontrada.",
  });
});

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("MongoDB conectado correctamente.");
  })
  .catch((error) => {
    console.error("MongoDB no esta conectado:", error.message);
  });

app.listen(PORT, () => {
  console.log(`SchoolMed disponible en http://localhost:${PORT}`);
});
