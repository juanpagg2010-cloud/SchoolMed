import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";

dotenv.config();

// Usuario coordinador inicial para administrar el sistema despues del despliegue.
const adminUser = {
  name: "Administrador SchoolMed",
  email: "juanpagg2010@gmail.com",
  password: "65747985",
  phone: "3000000000",
  role: "Coordinador",
  isActive: true,
};

// Crea o actualiza el admin sin duplicarlo; la contrasena siempre queda hasheada.
const seedAdmin = async () => {
  try {
    await connectDB();

    const encryptedPassword = await bcrypt.hash(adminUser.password, 10);

    const user = await User.findOneAndUpdate(
      { email: adminUser.email },
      {
        name: adminUser.name,
        email: adminUser.email,
        password: encryptedPassword,
        phone: adminUser.phone,
        role: adminUser.role,
        isActive: adminUser.isActive,
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log(`Usuario admin listo: ${user.email} (${user.role})`);
  } catch (error) {
    console.error(`Error creando usuario admin: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

// Ejecuta el seed solo cuando el archivo se corre directamente con npm run seed.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedAdmin();
}

export default seedAdmin;
