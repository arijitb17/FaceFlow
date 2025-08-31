// routes/studentAttendance.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "./auth_routes";
import type { AuthRequest } from "./route_types";
function mapStudent(s: any) {
  return {
    id: s.id,
    name: s.name,
    studentId: s.studentId,
    rollNo: s.rollNo,
    email: s.email,
    photos: s.photos || [],
    isTrainingComplete: s.isTrainingComplete ?? false,
    user: s.user
      ? {
          id: s.user.id,
          name: s.user.name,
          email: s.user.email,
          username: s.user.username,
          role: s.user.role,
        }
      : null,
  };
}
export function registerStudentAttendanceRoutes(app: Express) {
  /** ---------------- Get all students ---------------- */
  app.get("/api/students", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const students = await storage.getStudents();

      res.json({
        students: students.map(s => ({
          id: s.id,
          name: s.name,
          studentId: s.studentId,
          rollNo: s.rollNo,
          email: s.email,
          photos: s.photos || [],
          isTrainingComplete: s.isTrainingComplete ?? false,
        }))
      });
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  /** ---------------- Get a student's attendance ---------------- */
  app.get("/api/attendance/:studentId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { studentId } = req.params;

      let student;
      // If logged-in student requests "me" or their own ID
      if (studentId === "me" || studentId === req.user?.userId) {
        student = await storage.getStudent(req.user!.userId);
      } else {
        student =
          (await storage.getStudentByStudentId(studentId)) ||
          (await storage.getStudent(studentId));
      }

      if (!student) return res.status(404).json({ message: "Student not found" });

      const sessions = await storage.getAttendanceSessions();
      const allRecords: any[] = [];

      for (const session of sessions) {
        const records = await storage.getAttendanceRecords(session.id);
        const studentRecord = records.find(r => r.studentId === student.id);
        const classInfo = session.classId ? await storage.getClass(session.classId) : null;

        allRecords.push({
          id: studentRecord?.id || `absent_${session.id}`,
          classId: session.classId,
          className: classInfo?.name || "Unknown Class",
          classCode: classInfo?.code || "N/A",
          date: session.date?.toISOString() || new Date().toISOString(),
          isPresent: studentRecord?.isPresent ?? false,
          confidence: studentRecord?.confidence ?? 0,
          detectionCount: studentRecord?.detectionCount ?? 0,
          sessionId: session.id,
        });
      }

      allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(allRecords);
    } catch (error) {
      console.error("Get student attendance error:", error);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  /** ---------------- Get student attendance stats ---------------- */
  app.get("/api/attendance/:studentId/stats", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { studentId } = req.params;

      const student =
        (await storage.getStudent(studentId)) ||
        (await storage.getStudentByStudentId(studentId));

      if (!student) return res.status(404).json({ message: "Student not found" });

      const sessions = await storage.getAttendanceSessions();
      let totalSessions = 0;
      let attendedSessions = 0;
      const classStats = new Map<string, { total: number; attended: number; className: string; classCode: string }>();

      for (const session of sessions) {
        if (!session.classId) continue;

        const records = await storage.getAttendanceRecords(session.id);
        const studentRecord = records.find(r => r.studentId === student.id);
        const classInfo = await storage.getClass(session.classId);

        totalSessions++;
        if (studentRecord?.isPresent) attendedSessions++;

        if (classInfo) {
          const className = classInfo.name;
          if (!classStats.has(className)) {
            classStats.set(className, {
              total: 0,
              attended: 0,
              className,
              classCode: classInfo.code,
            });
          }
          const stat = classStats.get(className)!;
          stat.total++;
          if (studentRecord?.isPresent) stat.attended++;
          classStats.set(className, stat);
        }
      }

      const attendancePercentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;
      const classWiseStats = Array.from(classStats.values()).map(stat => ({
        ...stat,
        percentage: stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 0,
      }));

      res.json({
        studentId: student.id,
        studentName: student.name,
        totalSessions,
        attendedSessions,
        attendancePercentage,
        classWiseStats,
        recentAttendance: {
          lastWeek: 0, // Implement if needed
          lastMonth: 0,
        },
      });
    } catch (error) {
      console.error("Get student attendance stats error:", error);
      res.status(500).json({ message: "Failed to fetch attendance statistics" });
    }
  });

  /** ---------------- Get session attendance for a student ---------------- */
  app.get("/api/attendance/session/:sessionId/student/:studentId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { sessionId, studentId } = req.params;

      const session = await storage.getAttendanceSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const student = await storage.getStudent(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const records = await storage.getAttendanceRecords(sessionId);
      const studentRecord = records.find(r => r.studentId === studentId);

      const recognitionResults = await storage.getRecognitionResults(sessionId);
      const studentRecognitions = recognitionResults.filter(r => r.studentId === studentId);

      const classInfo = session.classId ? await storage.getClass(session.classId) : null;

      res.json({
        session: {
          id: session.id,
          date: session.date,
          status: session.status,
          class: classInfo ? { name: classInfo.name, code: classInfo.code } : null,
        },
        student: {
          id: student.id,
          name: student.name,
          studentId: student.studentId,
        },
        attendance: studentRecord
          ? {
              isPresent: studentRecord.isPresent,
              confidence: studentRecord.confidence,
              detectionCount: studentRecord.detectionCount,
              recordedAt: studentRecord.createdAt,
            }
          : {
              isPresent: false,
              confidence: 0,
              detectionCount: 0,
              recordedAt: null,
            },
        recognitionDetails: studentRecognitions.map(r => ({
          confidence: r.confidence,
          imageIndex: r.imageIndex,
          bbox: r.bbox,
          timestamp: r.timestamp,
        })),
      });
    } catch (error) {
      console.error("Get session attendance detail error:", error);
      res.status(500).json({ message: "Failed to fetch session attendance details" });
    }
  });

  /** ---------------- Manual attendance ---------------- */
  app.post("/api/attendance/manual", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { sessionId, studentId, isPresent } = req.body;

      if (!sessionId || !studentId || typeof isPresent !== "boolean") {
        return res.status(400).json({ message: "Session ID, Student ID, and attendance status are required" });
      }

      const session = await storage.getAttendanceSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const student = await storage.getStudent(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const existingRecords = await storage.getAttendanceRecords(sessionId);
      if (existingRecords.find(r => r.studentId === studentId)) {
        return res.status(400).json({ message: "Attendance already recorded for this student in this session" });
      }

      const attendanceRecord = await storage.createAttendanceRecord({
        sessionId,
        studentId,
        isPresent,
        confidence: 1.0,
        detectionCount: 1,
      });

      res.json({
        success: true,
        message: `Manual attendance recorded for ${student.name}`,
        record: attendanceRecord,
      });
    } catch (error) {
      console.error("Manual attendance error:", error);
      res.status(500).json({ message: "Failed to record manual attendance" });
    }
  });

app.get("/api/students/my", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: userId missing" });
    }

    let students;
    if (req.user?.role === "admin") {
      // Admin can view all students
      students = await storage.getStudents();
    } else {
      // Teachers only see their own students
      students = await storage.getStudentsByTeacherViaClasses(userId);
    }

    res.json({ students: students.map(mapStudent) });
  } catch (err) {
    console.error("Error fetching teacher's students:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});


  /** ---------------- (Optional) Keep for admins ---------------- */
  app.get("/api/students/teacher/:teacherId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { teacherId } = req.params;
      const students = await storage.getStudentsByTeacherViaClasses(teacherId);
      res.json(students.map(mapStudent));
    } catch (err) {
      console.error("Error fetching students by teacher:", err);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });
}
