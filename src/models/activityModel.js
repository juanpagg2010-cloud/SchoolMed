import { Schema, model } from "mongoose";

// Movimiento visible en los paneles para mantener trazabilidad del sistema.
const activitySchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Usuario", "Grado", "Excusa", "Correo", "Sistema"],
      default: "Sistema",
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default model("Activity", activitySchema);
