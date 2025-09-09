// routes/dashboard.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";

export function registerDashboardRoutes(app: Express) {
  // Helper: get attendance records for a session
  async function getSessionAttendance(sessionId: string, classId?: string) {
    let students = [];
    if (classId) {
      students = await storage.getClassStudents(classId);
    }
    const attendanceRecords = await storage.getAttendanceRecords(sessionId);

    const totalStudents = students.length;
    const presentStudents = attendanceRecords.filter(r => r.isPresent).length;

    return { totalStudents, presentStudents };
  }

  app.get("/api/dashboard/stats", async (_req: Request, res: Response) => {
    try {
      const students = await storage.getStudents();
      const teachers = await storage.getTeachers();
      const classes = await storage.getClasses();
      const sessions = await storage.getAttendanceSessions();

      const today = new Date().toDateString();
      const todaySessions = sessions.filter(
        s => s.date && new Date(s.date).toDateString() === today
      );

      // Calculate today's attendance
      let totalExpectedToday = 0;
      let totalPresentToday = 0;

      for (const session of todaySessions) {
        if (!session.id) continue;
        const { totalStudents, presentStudents } = await getSessionAttendance(
  session.id,
  session.classId ?? undefined
);

        totalExpectedToday += totalStudents;
        totalPresentToday += presentStudents;
      }

      const todayAttendance = totalExpectedToday > 0 ? totalPresentToday / totalExpectedToday : 0;

      // Calculate accuracy across all sessions
      let totalConfidence = 0;
      let totalCount = 0;

      for (const session of sessions) {
        const recognitionResults = await storage.getRecognitionResults(session.id);
        const validResults = recognitionResults.filter(r => typeof r.confidence === "number" && !isNaN(r.confidence));
        const sessionConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0);
        if (validResults.length > 0) {
          totalConfidence += sessionConfidence / validResults.length;
          totalCount++;
        }
      }

      const accuracy = totalCount > 0 ? totalConfidence / totalCount : 0;

      res.json({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        activeClasses: classes.filter(c => c.isActive).length,
        todayAttendance,   // number 0–1
        todayClassesCount: todaySessions.length,
        accuracy,          // number 0–1
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === "completed").length,
        avgStudentsPerClass: classes.length ? Math.round(students.length / classes.length) : 0,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
}
