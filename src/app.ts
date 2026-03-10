import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { emisoresRouter } from "./routes/emisores.routes";
import { productosRouter } from "./routes/productos.routes";

;(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function toJSON() {
  return this.toString();
};

export const app = express();

const corsOptions = {
  origin: process.env.NODE_CORS_ACCESS
    ? JSON.parse(process.env.NODE_CORS_ACCESS)
    : ["http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));

app.get("/", (_req, res) => {
  res.send("API is running");
});

app.use("/auth", authRouter);
app.use("/emisores", emisoresRouter);
app.use("/emisores/:emisorUuid/productos", productosRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      code: "INVALID_JSON",
      message: "El cuerpo de la solicitud contiene JSON invalido.",
      details: err.message,
    });
  }

  console.error("Error no manejado:", err);
  return res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Ha ocurrido un error inesperado.",
  });
});
