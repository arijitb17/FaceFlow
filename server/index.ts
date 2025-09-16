import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import http from "http";
import cors from "cors";

const app = express();

// CORS configuration for development
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Allow large payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Serve dataset images
app.use("/datasets", express.static(path.join(process.cwd(), "dataset")));

// Request logger (same as before)
app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  res.json = (bodyJson: any) => {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathReq.startsWith("/api")) {
      let logLine = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 200) logLine = logLine.slice(0, 199) + "…";
      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // Register API routes
  await registerRoutes(app);

  // Health check
  app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  // 404 for API
  app.use("/api/*", (req, res) => res.status(404).json({ message: "API endpoint not found" }));

  // ✅ Serve built frontend
  const frontendPath = path.join(process.cwd(), "dist/public");
  app.use(express.static(frontendPath));

  // Fallback for client-side routing
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ message: "API endpoint not found" });
    res.sendFile(path.join(frontendPath, "index.html"));
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  const server = http.createServer(app);
  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Full-stack app running on http://0.0.0.0:${port}`);
    console.log(`📋 Health check at http://0.0.0.0:${port}/health`);
  });
})();
