import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";

dotenv.config();

const adminUser = {
  name: "Administrador SchoolMed",
  email: "juanpagg2010@gmail.com",
  password: "65747985",
  phone: "3000000000",
  role: "Coordinador",
  isActive: true,
};

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

seedAdmin();
