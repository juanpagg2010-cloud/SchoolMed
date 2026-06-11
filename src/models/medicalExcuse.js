import { Schema, model } from "mongoose";

// Modelo principal de excusas medicas con revision institucional.
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
      // Flujo: acudiente radica, coordinador revisa y profesor consulta aprobadas.
      enum: [
        "PendienteRevision",
        "Aprobada",
        "Rechazada",
        "Cancelada",
      ],
      default: "PendienteRevision",
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
    codigoValidacion: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    qrPayload: {
      type: String,
      trim: true,
    },
    fechaCodigoValidacion: {
      type: Date,
    },
    identityVerification: {
      method: {
        type: String,
        enum: ["face-scan"],
      },
      provider: {
        type: String,
        default: "aws-rekognition",
      },
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
  {
    timestamps: true,
    versionKey: false,
  },
);

export default model("MedicalExcuse", medicalExcuseSchema);
