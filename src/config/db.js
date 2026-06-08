import mongoose from "mongoose";
import dns from "node:dns";

// Usa DNS publicos para evitar fallos comunes resolviendo MongoDB Atlas.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Conecta la aplicacion a MongoDB usando la cadena definida en .env.
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Falta la variable MONGO_URI en el archivo .env");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error de conexión: ${error.message}`);
    throw error;
  }
};

export default connectDB;
