// routes/attendance.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertAttendanceSessionSchema } from "@shared/schema";
import type { Student, User } from "@shared/schema";
import { z } from "zod";

export function registerAttendanceRoutes(app: Express) {
  // -------------------- Helper --------------------
async function mapStudentsWithAttendance(sessionId: string, classId?: string) {
  let students: (Student & { user: User })[] = [];
  if (classId) {
    students = await storage.getClassStudents(classId);
  }

  const attendanceRecords = await storage.getAttendanceRecords(sessionId);

  return students.map((s) => {
    const record = attendanceRecords.find(r => r.studentId === s.id); // match DB PK

    return {
      id: s.id,              // DB primary key
      studentId: s.studentId, // admission/roll number for frontend/logs
      name: s.user?.name || s.name || "Unknown",
      recognized: record?.isPresent ?? false,
      confidence: record?.confidence ?? 0,
    };
  });
}



  // -------------------- Routes --------------------

  // Get all attendance sessions with full student info
  app.get("/api/attendance-sessions", async (_req: Request, res: Response) => {
    try {
      const sessions = await storage.getAttendanceSessions();

      const sessionsWithStudents = await Promise.all(
        sessions.map(async (session) => {
          const students = await mapStudentsWithAttendance(session.id, session.classId ?? undefined);
          return {
            ...session,
            students,
          };
        })
      );

      res.json(sessionsWithStudents);
    } catch (error) {
      console.error("Error fetching attendance sessions:", error);
      res.status(500).json({ message: "Failed to fetch attendance sessions" });
    }
  });

  // Get single session by ID with full student info
  app.get("/api/attendance-sessions/:id", async (req: Request, res: Response) => {
    try {
      const session = await storage.getAttendanceSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const students = await mapStudentsWithAttendance(session.id, session.classId ?? undefined);

      res.json({ ...session, students });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch session" });
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

  // Get attendance records for a session (raw records)
  app.get("/api/attendance-sessions/:id/records", async (req: Request, res: Response) => {
    try {
      const records = await storage.getAttendanceRecords(req.params.id);
      res.json(records ?? []);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  // Detailed sessions for frontend summary
  app.get("/api/attendance-sessions/detailed", async (_req: Request, res: Response) => {
    try {
      const sessions = await storage.getAttendanceSessions();

      const detailedSessions = await Promise.all(
        sessions.map(async (session) => {
          const students = await mapStudentsWithAttendance(session.id, session.classId ?? undefined);

          const cls = session.classId ? await storage.getClass(session.classId) : null;
          return {
            ...session,
            students,
            class: cls ? { name: cls.name, code: cls.code } : null,
          };
        })
      );

      res.json(detailedSessions);
    } catch (error) {
      console.error("Detailed sessions error:", error);
      res.status(500).json({ message: "Failed to fetch detailed sessions" });
    }
  });

  // Get full teacher report
  app.get("/api/teacher/:userId/report", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const report = await storage.getTeacherReport(userId);

      if (!report) {
        return res.status(404).json({ message: "Teacher not found or has no classes" });
      }

      res.json(report);
    } catch (error) {
      console.error("Teacher report error:", error);
      res.status(500).json({ message: "Failed to fetch teacher report" });
    }
  });
} 