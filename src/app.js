import cors from "cors";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import routes from "./routes/index.js";

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientPath = join(__dirname, "..", "client");

// Middlewares globales para recibir JSON, formularios y peticiones desde otros origenes.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(clientPath));

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

app.get("/favicon.ico", (req, res) => {
  res.sendFile(join(clientPath, "favicon.svg"));
});

// Version actual de la API. /api se conserva como alias simple.
app.use("/api/v1", routes);
app.use("/api", routes);

// Middlewares finales para rutas inexistentes y errores no controlados.
app.use(notFound);
app.use(errorHandler);

export default app;
