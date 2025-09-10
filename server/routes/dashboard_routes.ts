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

  // Admin dashboard stats - system-wide
  app.get("/api/dashboard/admin/stats", async (_req: Request, res: Response) => {
    try {
      const students = await storage.getStudents();
      const teachers = await storage.getTeachers();
      const classes = await storage.getClasses();
      const sessions = await storage.getAttendanceSessions();

      const today = new Date().toDateString();
      const todaySessions = sessions.filter(
        s => s.date && new Date(s.date).toDateString() === today
      );

      // Calculate today's attendance across all sessions
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

      // Calculate system-wide accuracy
      let totalConfidence = 0;
      let totalCount = 0;

      for (const session of sessions) {
        const recognitionResults = await storage.getRecognitionResults(session.id);
        const validResults = recognitionResults.filter(r => 
          typeof r.confidence === "number" && 
          !isNaN(r.confidence) && 
          isFinite(r.confidence)
        );
        
        if (validResults.length > 0) {
          const sessionConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;
          if (!isNaN(sessionConfidence) && isFinite(sessionConfidence)) {
            totalConfidence += sessionConfidence;
            totalCount++;
          }
        }
      }

      const accuracy = totalCount > 0 ? totalConfidence / totalCount : 0;

      res.json({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        activeClasses: classes.filter(c => (c as any).isActive !== false).length,
        todayAttendance,   // number 0–1
        todayClassesCount: todaySessions.length,
        accuracy,          // number 0–1
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === "completed").length,
        avgStudentsPerClass: classes.length ? Math.round(students.length / classes.length) : 0,
        systemHealth: 0.998, // 99.8% - you can calculate this based on actual metrics
      });
    } catch (error) {
      console.error("Admin dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch admin dashboard stats" });
    }
  });

  // Teacher dashboard stats - teacher-specific
  app.get("/api/dashboard/teacher/stats/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Get teacher's classes and students
      const classes = await storage.getClassesByTeacher(userId);
      const allStudents = await storage.getStudentsByTeacherViaClasses(userId);

      // Get today's date range
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Get all sessions for this teacher
      const allSessions = await storage.getAttendanceSessionsByTeacher(userId);

      // Filter sessions for today
      const todaySessions = allSessions.filter(session => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate >= todayStart && sessionDate < todayEnd;
      });

      // Calculate today's attendance for teacher's classes
      let totalStudentsToday = 0;
      let presentStudentsToday = 0;

      for (const session of todaySessions) {
        if (!session.classId) continue;
        
        const { totalStudents, presentStudents } = await getSessionAttendance(
          session.id,
          session.classId
        );

        totalStudentsToday += totalStudents;
        presentStudentsToday += presentStudents;
      }

      const todayAttendance = totalStudentsToday > 0 
        ? presentStudentsToday / totalStudentsToday 
        : 0;

      // Calculate accuracy from recent sessions (last 7 days)
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentSessions = allSessions.filter(session => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate >= weekAgo;
      });

      let totalConfidenceSum = 0;
      let totalRecognitions = 0;

      for (const session of recentSessions) {
        const recognitionResults = await storage.getRecognitionResults(session.id);
        const validResults = recognitionResults.filter(r => 
          typeof r.confidence === "number" && 
          !isNaN(r.confidence) && 
          isFinite(r.confidence)
        );
        
        if (validResults.length > 0) {
          const sessionConfidence = validResults.reduce(
            (sum, r) => sum + (r.confidence ?? 0),
            0
          ) / validResults.length;
          
          if (!isNaN(sessionConfidence) && isFinite(sessionConfidence)) {
            totalConfidenceSum += sessionConfidence;
            totalRecognitions++;
          }
        }
      }

      const accuracy = totalRecognitions > 0 
        ? totalConfidenceSum / totalRecognitions 
        : 0;

      // Count active classes
      const activeClasses = classes.filter(c => (c as any).isActive !== false).length;

      res.json({
        totalStudents: allStudents.length,
        todayAttendance,   // number 0–1
        activeClasses,
        accuracy,          // number 0–1
        totalSessions: allSessions.length,
        todayClassesCount: todaySessions.length,
        completedSessions: allSessions.filter(s => s.status === "completed").length,
      });
    } catch (error) {
      console.error("Teacher dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch teacher dashboard stats" });
    }
  });

  // Generic stats endpoint that routes based on user role
  // You can call this with query params: /api/dashboard/stats?userId=xxx&role=teacher
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const { userId, role } = req.query;

      if (!userId || !role) {
        return res.status(400).json({ 
          message: "userId and role query parameters are required",
          example: "/api/dashboard/stats?userId=123&role=teacher"
        });
      }

      if (typeof userId !== 'string' || typeof role !== 'string') {
        return res.status(400).json({ message: "userId and role must be strings" });
      }

      if (role === "admin") {
        // Get admin stats (userId not needed for admin stats)
        const students = await storage.getStudents();
        const teachers = await storage.getTeachers();
        const classes = await storage.getClasses();
        const sessions = await storage.getAttendanceSessions();

        const today = new Date().toDateString();
        const todaySessions = sessions.filter(
          s => s.date && new Date(s.date).toDateString() === today
        );

        // Calculate today's attendance across all sessions
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

        // Calculate system-wide accuracy
        let totalConfidence = 0;
        let totalCount = 0;

        for (const session of sessions) {
          const recognitionResults = await storage.getRecognitionResults(session.id);
          const validResults = recognitionResults.filter(r => 
            typeof r.confidence === "number" && 
            !isNaN(r.confidence) && 
            isFinite(r.confidence)
          );
          
          if (validResults.length > 0) {
            const sessionConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;
            if (!isNaN(sessionConfidence) && isFinite(sessionConfidence)) {
              totalConfidence += sessionConfidence;
              totalCount++;
            }
          }
        }

        const accuracy = totalCount > 0 ? totalConfidence / totalCount : 0;

        return res.json({
          totalStudents: students.length,
          totalTeachers: teachers.length,
          totalClasses: classes.length,
          activeClasses: classes.filter(c => (c as any).isActive !== false).length,
          todayAttendance,
          todayClassesCount: todaySessions.length,
          accuracy,
          totalSessions: sessions.length,
          completedSessions: sessions.filter(s => s.status === "completed").length,
          avgStudentsPerClass: classes.length ? Math.round(students.length / classes.length) : 0,
          systemHealth: 0.998,
        });

      } else if (role === "teacher") {
        // Get teacher stats
        const classes = await storage.getClassesByTeacher(userId);
        const allStudents = await storage.getStudentsByTeacherViaClasses(userId);

        // Get today's date range
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // Get all sessions for this teacher
        const allSessions = await storage.getAttendanceSessionsByTeacher(userId);

        // Filter sessions for today
        const todaySessions = allSessions.filter(session => {
          if (!session.date) return false;
          const sessionDate = new Date(session.date);
          return sessionDate >= todayStart && sessionDate < todayEnd;
        });

        // Calculate today's attendance for teacher's classes
        let totalStudentsToday = 0;
        let presentStudentsToday = 0;

        for (const session of todaySessions) {
          if (!session.classId) continue;
          
          const { totalStudents, presentStudents } = await getSessionAttendance(
            session.id,
            session.classId
          );

          totalStudentsToday += totalStudents;
          presentStudentsToday += presentStudents;
        }

        const todayAttendance = totalStudentsToday > 0 
          ? presentStudentsToday / totalStudentsToday 
          : 0;

        // Calculate accuracy from recent sessions (last 7 days)
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentSessions = allSessions.filter(session => {
          if (!session.date) return false;
          const sessionDate = new Date(session.date);
          return sessionDate >= weekAgo;
        });

        let totalConfidenceSum = 0;
        let totalRecognitions = 0;

        for (const session of recentSessions) {
          const recognitionResults = await storage.getRecognitionResults(session.id);
          const validResults = recognitionResults.filter(r => 
            typeof r.confidence === "number" && 
            !isNaN(r.confidence) && 
            isFinite(r.confidence)
          );
          
          if (validResults.length > 0) {
            const sessionConfidence = validResults.reduce(
              (sum, r) => sum + (r.confidence ?? 0),
              0
            ) / validResults.length;
            
            if (!isNaN(sessionConfidence) && isFinite(sessionConfidence)) {
              totalConfidenceSum += sessionConfidence;
              totalRecognitions++;
            }
          }
        }

        const accuracy = totalRecognitions > 0 
          ? totalConfidenceSum / totalRecognitions 
          : 0;

        // Count active classes
        const activeClasses = classes.filter(c => (c as any).isActive !== false).length;

        return res.json({
          totalStudents: allStudents.length,
          todayAttendance,
          activeClasses,
          accuracy,
          totalSessions: allSessions.length,
          todayClassesCount: todaySessions.length,
          completedSessions: allSessions.filter(s => s.status === "completed").length,
        });

      } else {
        return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'teacher'" });
      }
    } catch (error) {
      console.error("Dashboard stats routing error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
}