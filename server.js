import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.conf.js";
import errorHandler from "./src/middlewares/errorHandler.js";
import logger from "./src/middlewares/logger.js";
import routes from "./src/routes/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || "development";

const rawOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL;
let allowedOrigins = rawOrigins
  ? rawOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

if (allowedOrigins.length === 0) {
  if (nodeEnv === "production") {
    throw new Error(
      "Falta configurar CORS_ALLOWED_ORIGINS o FRONTEND_URL en producción",
    );
  }
  allowedOrigins = ["http://localhost:3000"];
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(logger);

connectDB();

app.get("/", (req, res) => {
  res.send("API Ecommerce con MongoDB");
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method, // GET / POST / PUT ...
    url: req.originalUrl, // http://localhost:3000/...
  });
});

app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running on port ${port} (${nodeEnv})`);
  });
}

export default app;
