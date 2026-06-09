import dotenv from "dotenv";
<<<<<<< HEAD
import express from "express";
import mongoose from "mongoose";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/authRoutes.js";
import medicalExcuseRoutes from "./routes/medicalExcuseRoutes.js";
import userRoutes from "./routes/userRoutes.js";
=======
import app from "./app.js";
import connectDB from "./config/db.js";
>>>>>>> 84e06b794f6efba1ec001279046c9d0b9247cf60

dotenv.config();

const PORT = process.env.PORT || 3000;

// Punto de entrada del backend: carga variables, conecta MongoDB y levanta Express.
const startServer = async () => {
  try {
    await connectDB();

<<<<<<< HEAD
app.use("/api/auth", authRoutes);
app.use("/api/medical-excuses", medicalExcuseRoutes);
app.use("/api/users", userRoutes);
=======
    app.listen(PORT, () => {
      console.log(`SchoolMed API escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`No se pudo iniciar el servidor: ${error.message}`);
    process.exit(1);
  }
};
>>>>>>> 84e06b794f6efba1ec001279046c9d0b9247cf60

startServer();
