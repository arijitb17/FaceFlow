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

      const today = new Date();
      const todaySessions = sessions.filter(session => 
        session.date && new Date(session.date).toDateString() === today.toDateString()
      );

      const todayAttendance = todaySessions.length
        ? Math.round(todaySessions.reduce((acc, s) => acc + (s.totalStudentsRecognized || 0), 0) / todaySessions.length)
        : 0;

      const stats = {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        activeClasses: classes.filter(c => c.isActive).length,
        todayAttendance: `${todayAttendance}%`,
        todayClassesCount: todaySessions.length,
        accuracy: sessions.length
          ? `${Math.round(sessions.reduce((acc, s) => acc + (s.averageConfidence || 0), 0) / sessions.length * 100)}%`
          : "0%",
        // Additional stats for reports
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        avgStudentsPerClass: classes.length ? Math.round(students.length / classes.length) : 0
      };

      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
}