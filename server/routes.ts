// routes/index.ts
import type { Express } from "express";
import { createServer, type Server } from "http";

// Import route modules
import { registerAuthRoutes } from "./routes/auth_routes";
import { registerUserRoutes } from "./routes/user_routes";
import { registerTeacherRoutes } from "./routes/teacher_routes";
import { registerStudentAttendanceRoutes } from "./routes/student_routes";
import { registerClassRoutes } from "./routes/class_routes";
import { registerAttendanceRoutes } from "./routes/attendance_routes";
import { registerFaceRecognitionRoutes } from "./routes/face_recognition_routes";
import { registerDashboardRoutes } from "./routes/dashboard_routes";
import { registerSettingsRoutes } from "./routes/settings_routes";


export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route modules
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerTeacherRoutes(app);
  registerStudentAttendanceRoutes(app);
  registerClassRoutes(app);
  registerAttendanceRoutes(app);
  registerFaceRecognitionRoutes(app);
  registerDashboardRoutes(app);
  registerSettingsRoutes(app);


  // Return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}