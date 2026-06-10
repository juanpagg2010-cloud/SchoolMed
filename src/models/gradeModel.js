import { Schema, model } from "mongoose";

// Curso o grado gestionado por coordinacion para organizar consultas de profesores.
const gradeSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del grado es obligatorio"],
      trim: true,
    },
    group: {
      type: String,
      required: [true, "El grupo es obligatorio"],
      trim: true,
      uppercase: true,
    },
    teacher: {
      type: String,
      trim: true,
    },
    students: {
      type: Number,
      default: 0,
      min: [0, "La cantidad de estudiantes no puede ser negativa"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

gradeSchema.index({ name: 1, group: 1 }, { unique: true });

export default model("Grade", gradeSchema);
