import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { createActivity } from "../services/activityService.js";
import { sendManualEmail } from "../services/emailService.js";

const router = Router();
const COORDINATOR = "Coordinador";

const getUserId = (user) => user?._id || user?.id;

router.use(protect);
router.use(authorizeRoles(COORDINATOR));

// Envia un correo manual con Brevo API.
router.post("/send", async (req, res) => {
  try {
    const { body, subject, to } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        ok: false,
        message: "Destinatario, asunto y mensaje son obligatorios.",
      });
    }

    const emailResult = await sendManualEmail({ body, subject, to });

    await createActivity({
      actorId: getUserId(req.user),
      message: `Coordinacion envio un correo manual a ${to}.`,
      metadata: { subject, to },
      type: "Correo",
    });

    return res.status(200).json({
      ok: true,
      emailSent: emailResult.sent,
      emailResult,
      message: "Correo enviado correctamente.",
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      ok: false,
      message: err.message || "No se pudo enviar el correo.",
    });
  }
});

export default router;
