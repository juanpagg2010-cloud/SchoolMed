import Activity from "../models/activityModel.js";

// Registra un movimiento sin detener el flujo principal si falla el historial.
export const createActivity = async ({ actorId, message, metadata = {}, type = "Sistema" }) => {
  try {
    return await Activity.create({ actorId, message, metadata, type });
  } catch (error) {
    console.error(`No se pudo registrar actividad: ${error.message}`);
    return null;
  }
};

// Lista los ultimos movimientos para los paneles.
export const getRecentActivities = ({ limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 50);
  return Activity.find()
    .populate("actorId", "name email role")
    .sort({ createdAt: -1 })
    .limit(safeLimit);
};

export default {
  createActivity,
  getRecentActivities,
};
