import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Punto de entrada del backend: carga variables, conecta MongoDB y levanta Express.
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`SchoolMed API escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`No se pudo iniciar el servidor: ${error.message}`);
    process.exit(1);
  }
};

startServer();
