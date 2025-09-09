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

      // Calculate today's attendance percentage with proper validation
      let todayAttendance = 0;
      let totalPresentToday = 0;
      let totalExpectedToday = 0;

      console.log("Today sessions found:", todaySessions.length);

      if (todaySessions.length > 0) {
        // Try to get actual attendance records for more accurate calculation
        for (const session of todaySessions) {
          try {
            const attendanceRecords = await storage.getAttendanceRecords(session.id);
            const classStudents = await storage.getClassStudents(session.classId!);
            
            totalExpectedToday += classStudents.length;
            totalPresentToday += attendanceRecords.filter(r => r.isPresent === true).length;
            
            console.log(`Session ${session.id}: ${attendanceRecords.filter(r => r.isPresent === true).length}/${classStudents.length} present`);
          } catch (error) {
            console.log("Could not get detailed attendance for session:", session.id);
            // Fallback to session totals if available
            const recognized = session.totalStudentsRecognized ?? 0;
            const detected = session.totalFacesDetected ?? 0;
            
            if (detected > 0) {
              totalExpectedToday += detected;
              totalPresentToday += recognized;
            }
          }
        }

        if (totalExpectedToday > 0) {
          todayAttendance = (totalPresentToday / totalExpectedToday) * 100;
          console.log(`Total attendance: ${totalPresentToday}/${totalExpectedToday} = ${todayAttendance.toFixed(1)}%`);
        } else {
          console.log("No expected students found for today");
        }
      } else {
        console.log("No sessions found for today");
      }

      // Calculate overall recognition accuracy with validation
      let accuracy = 0;
      if (sessions.length > 0) {
        const validSessions = sessions.filter(session => {
          const conf = session.averageConfidence;
          return (
            conf !== null && 
            conf !== undefined && 
            !isNaN(conf) && 
            isFinite(conf)
          );
        });

        if (validSessions.length > 0) {
          const sum = validSessions.reduce((acc, session) => {
            return acc + (session.averageConfidence!);
          }, 0);
          accuracy = (sum / validSessions.length) * 100;
        }
      }

      // Ensure all values are safe numbers
      const safeValue = (value: number): number => {
        if (isNaN(value) || !isFinite(value)) return 0;
        return Math.max(0, value);
      };

      const stats = {
  totalStudents: students.length,
  totalTeachers: teachers.length,
  totalClasses: classes.length,
  activeClasses: classes.filter(c => c.isActive).length,
  todayAttendance: safeValue(todayAttendance) / 100, // 0–1
  todayClassesCount: todaySessions.length,
  accuracy: safeValue(accuracy) / 100,               // 0–1
  totalSessions: sessions.length,
  completedSessions: sessions.filter(s => s.status === "completed").length,
  avgStudentsPerClass: classes.length ? Math.round(students.length / classes.length) : 0,
};


      console.log("Final stats:", stats);

      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
}