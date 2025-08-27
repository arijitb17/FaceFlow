// routes/attendance.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertAttendanceSessionSchema } from "@shared/schema";
import { z } from "zod";

export function registerAttendanceRoutes(app: Express) {
  // Get all attendance sessions
  app.get("/api/attendance-sessions", async (_req: Request, res: Response) => {
    try {
      const sessions = await storage.getAttendanceSessions();
      res.json(sessions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch attendance sessions" });
    }
  });

  // Create attendance session
  app.post("/api/attendance-sessions", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAttendanceSessionSchema.parse(req.body);
      const session = await storage.createAttendanceSession({
        classId: validatedData.classId ?? null,
        date: validatedData.date ?? new Date(),
      });
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) 
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      console.error(error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // Get attendance session by ID
  app.get("/api/attendance-sessions/:id", async (req: Request, res: Response) => {
    try {
      const session = await storage.getAttendanceSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      res.json(session);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Get attendance records for a session
  app.get("/api/attendance-sessions/:id/records", async (req: Request, res: Response) => {
    try {
      const records = await storage.getAttendanceRecords(req.params.id);
      res.json(records);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  // Get attendance sessions with populated class and teacher data
  app.get("/api/attendance-sessions/detailed", async (_req: Request, res: Response) => {
    try {
      const sessions = await storage.getAttendanceSessions();
      
      // Populate with class and teacher data
      const detailedSessions = [];
      for (const session of sessions) {
        if (session.classId) {
          const classData = await storage.getClass(session.classId);
          if (classData && classData.teacherId) {
            const teachers = await storage.getTeachers();
            const teacher = teachers.find(t => t.id === classData.teacherId);
            if (teacher) {
              const user = await storage.getUser(teacher.userId);
              detailedSessions.push({
                ...session,
                sessionDate: session.date,
                startTime: session.date,
                endTime: session.date, // You might want to add actual end time to your schema
                class: {
                  name: classData.name,
                  code: classData.code
                },
                teacher: {
                  user: {
                    name: user?.name || "Unknown"
                  }
                }
              });
            }
          }
        }
      }
      
      res.json(detailedSessions);
    } catch (error) {
      console.error("Detailed sessions error:", error);
      res.status(500).json({ message: "Failed to fetch detailed sessions" });
    }
  });
}