// routes/dashboard.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";

export function registerDashboardRoutes(app: Express) {
  // Get dashboard statistics
  app.get("/api/dashboard/stats", async (_req: Request, res: Response) => {
    try {
      const students = await storage.getStudents();
      const teachers = await storage.getTeachers();
      const classes = await storage.getClasses();
      const sessions = await storage.getAttendanceSessions();

      const today = new Date().toDateString();

      // Sessions for today
      const todaySessions = sessions.filter(
        (session) => session.date && new Date(session.date).toDateString() === today
      );

      // Calculate average students recognized today
      const todayAttendance = todaySessions.length
        ? Math.round(
            todaySessions.reduce(
              (sum, session) => sum + (session.totalStudentsRecognized ?? 0),
              0
            ) / todaySessions.length
          )
        : 0;

      // Calculate overall accuracy
      const accuracy = sessions.length
        ? Math.round(
            (sessions.reduce(
              (sum, session) => sum + (session.averageConfidence ?? 0),
              0
            ) /
              sessions.length) *
              100
          )
        : 0;

      const stats = {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        activeClasses: classes.filter((c) => c.isActive).length,
        todayAttendance: `${todayAttendance}%`,
        todayClassesCount: todaySessions.length,
        accuracy: `${accuracy}%`,
        totalSessions: sessions.length,
        completedSessions: sessions.filter((s) => s.status === "completed").length,
        avgStudentsPerClass: classes.length
          ? Math.round(students.length / classes.length)
          : 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
}
