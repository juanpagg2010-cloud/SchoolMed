import { Schema, model } from "mongoose";

const medicalExcuseSchema = new Schema(
  {
    acudienteId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nombreEstudiante: {
      type: String,
      required: [true, "El nombre del estudiante es obligatorio"],
      trim: true,
    },
    documentoEstudiante: {
      type: String,
      trim: true,
    },
    grado: {
      type: String,
      required: [true, "El grado es obligatorio"],
      trim: true,
    },
    grupo: {
      type: String,
      trim: true,
      uppercase: true,
    },
    motivo: {
      type: String,
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
    },
    archivo: {
      nombreOriginal: String,
      nombreArchivo: String,
      ruta: String,
      tipo: String,
      tamano: Number,
    },
    fechaInicio: {
      type: Date,
      required: [true, "La fecha de inicio es obligatoria"],
    },
    fechaFin: {
      type: Date,
      required: [true, "La fecha final es obligatoria"],
    },
    estado: {
      type: String,
      enum: [
        "PendienteVerificacion",
        "PendienteRevision",
        "Aprobada",
        "Rechazada",
        "Cancelada",
      ],
      default: "PendienteVerificacion",
    },
    verificacion: {
      codigoHash: {
        type: String,
        select: false,
      },
      expiraEn: {
        type: Date,
      },
      intentos: {
        type: Number,
        default: 0,
      },
      verificadoEn: {
        type: Date,
      },
      enviadoEn: {
        type: Date,
      },
    },
    coordinadorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    fechaRevision: {
      type: Date,
    },
    motivoRechazo: {
      type: String,
      trim: true,
    },
    motivoCancelacion: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default model("MedicalExcuse", medicalExcuseSchema);
