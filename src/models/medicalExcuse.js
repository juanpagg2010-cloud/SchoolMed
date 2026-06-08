import { Schema, model } from "mongoose";

// Modelo principal de excusas medicas con verificacion por correo y revision institucional.
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
      // Flujo: acudiente verifica, coordinador revisa y profesor consulta aprobadas.
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
      // El codigo se guarda hasheado; nunca se persiste en texto plano.
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
