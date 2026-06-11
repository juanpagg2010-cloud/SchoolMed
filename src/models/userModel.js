import { Schema, model } from "mongoose";

// Modelo de usuario para autenticacion, roles y permisos dentro del sistema.
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El correo es obligatorio"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Ingresa un correo valido"],
    },
    password: {
      type: String,
      required: [true, "La contrasena es obligatoria"],
      minlength: [6, "La contrasena debe tener minimo 6 caracteres"],
      select: false,
    },
    role: {
      type: String,
      enum: ["Coordinador", "Profesor", "Acudiente"],
      default: "Acudiente",
      required: true,
    },
    phone: {
      type: String,
      required: [true, "El telefono es obligatorio"],
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    faceAuth: {
      enabled: {
        type: Boolean,
        default: false,
      },
      provider: {
        type: String,
        default: "aws-rekognition",
      },
      collectionId: {
        type: String,
        trim: true,
      },
      externalFaceId: {
        type: String,
        trim: true,
      },
      faceId: {
        type: String,
        trim: true,
      },
      similarityThreshold: {
        type: Number,
        default: 95,
      },
      registeredAt: {
        type: Date,
      },
      lastVerifiedAt: {
        type: Date,
      },
      lastVerification: {
        success: {
          type: Boolean,
          default: false,
        },
        similarity: {
          type: Number,
          default: 0,
        },
        verifiedAt: {
          type: Date,
        },
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default model("User", userSchema);
