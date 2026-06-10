import cors from "cors";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import routes from "./routes/index.js";

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientPath = join(__dirname, "..", "client");
const uploadsPath = join(__dirname, "..", "uploads");

// Middlewares globales para recibir JSON, formularios y peticiones desde otros origenes.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(clientPath));
app.use("/uploads", express.static(uploadsPath));

// Ruta base para comprobar rapidamente que la API esta viva.
app.get("/", (req, res) => {
  res.sendFile(join(clientPath, "index.html"));
});

// Health check pensado para pruebas, despliegues o monitoreo.
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
  });
});

// Muestra la IP publica de salida del servidor para autorizar SMTP en Brevo.
app.get("/api/server-ip", async (req, res) => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();

    res.json({
      ok: true,
      ip: data.ip,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "No se pudo consultar la IP publica del servidor.",
    });
  }
});

// Diagnostico publico y seguro del proveedor de correo configurado.
app.get("/api/email-provider", (req, res) => {
  const host = process.env.SMTP_HOST || "";
  const isBrevo = host.includes("sendinblue.com") || host.includes("brevo.com");

  res.json({
    ok: true,
    provider: isBrevo ? "Brevo" : "No identificado",
    smtpHost: host || null,
    smtpPort: process.env.SMTP_PORT || null,
    smtpUserConfigured: Boolean(process.env.SMTP_USER),
    smtpPasswordConfigured: Boolean(process.env.SMTP_PASS),
    mailFrom: process.env.MAIL_FROM || null,
  });
});

app.get("/favicon.ico", (req, res) => {
  res.sendFile(join(clientPath, "assets", "favicon.jfif"));
});

// Version actual de la API. /api se conserva como alias simple.
app.use("/api/v1", routes);
app.use("/api", routes);

// Middlewares finales para rutas inexistentes y errores no controlados.
app.use(notFound);
app.use(errorHandler);

export default app;
