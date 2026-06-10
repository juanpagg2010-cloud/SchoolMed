import Grade from "../models/gradeModel.js";
import { createActivity } from "./activityService.js";

// Crea un grado/curso administrado por coordinacion.
export const createGrade = async (payload, actorId) => {
  const { group, name, students, teacher } = payload;

  if (!name || !group) {
    const error = new Error("Nombre del grado y grupo son obligatorios.");
    error.statusCode = 400;
    throw error;
  }

  const grade = await Grade.create({
    group,
    name,
    students: Number(students || 0),
    teacher,
  });

  await createActivity({
    actorId,
    message: `Se agrego el grado ${grade.name} ${grade.group}.`,
    metadata: { gradeId: grade._id },
    type: "Grado",
  });

  return grade;
};

// Lista todos los grados ordenados para lectura en coordinacion y profesores.
export const getGrades = () => {
  return Grade.find().sort({ name: 1, group: 1 });
};

// Actualiza un grado existente.
export const updateGrade = async (id, payload, actorId) => {
  const { group, name, students, teacher } = payload;
  const updates = { group, name, students, teacher };
  Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

  const grade = await Grade.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!grade) {
    const error = new Error("Grado no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await createActivity({
    actorId,
    message: `Se actualizo el grado ${grade.name} ${grade.group}.`,
    metadata: { gradeId: grade._id },
    type: "Grado",
  });

  return grade;
};

// Elimina un grado administrado por coordinacion.
export const deleteGrade = async (id, actorId) => {
  const grade = await Grade.findByIdAndDelete(id);

  if (!grade) {
    const error = new Error("Grado no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await createActivity({
    actorId,
    message: `Coordinacion retiro el grado ${grade.name} ${grade.group}.`,
    metadata: { gradeId: grade._id },
    type: "Grado",
  });

  return grade;
};

export default {
  createGrade,
  deleteGrade,
  getGrades,
  updateGrade,
};
