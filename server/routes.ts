import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { faceRecognitionService } from "./services/faceRecognition";
import { 
  insertStudentSchema, 
  insertClassSchema, 
  insertAttendanceSessionSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Students
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const validatedData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validatedData);
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({ message: "Invalid student data" });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const student = await storage.updateStudent(req.params.id, req.body);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStudent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Classes
  app.get("/api/classes", async (req, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post("/api/classes", async (req, res) => {
    try {
      const validatedData = insertClassSchema.parse(req.body);
      const classData = await storage.createClass({
        ...validatedData,
        teacherId: "teacher-1" // Hardcoded for now
      });
      res.status(201).json(classData);
    } catch (error) {
      res.status(400).json({ message: "Invalid class data" });
    }
  });

  app.get("/api/classes/:id", async (req, res) => {
    try {
      const classData = await storage.getClass(req.params.id);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.json(classData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  app.get("/api/classes/:id/students", async (req, res) => {
    try {
      const students = await storage.getClassStudents(req.params.id);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class students" });
    }
  });

  app.post("/api/classes/:classId/students/:studentId", async (req, res) => {
    try {
      const enrollment = await storage.enrollStudent(req.params.classId, req.params.studentId);
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(500).json({ message: "Failed to enroll student" });
    }
  });

  // Attendance Sessions
  app.get("/api/attendance-sessions", async (req, res) => {
    try {
      const sessions = await storage.getAttendanceSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance sessions" });
    }
  });

  app.post("/api/attendance-sessions", async (req, res) => {
    try {
      const validatedData = insertAttendanceSessionSchema.parse(req.body);
      const session = await storage.createAttendanceSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.get("/api/attendance-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getAttendanceSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.get("/api/attendance-sessions/:id/records", async (req, res) => {
    try {
      const records = await storage.getAttendanceRecords(req.params.id);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  // Face Recognition
  app.post("/api/face-recognition/train", async (req, res) => {
    try {
      const { studentPhotos } = req.body;
      const success = await faceRecognitionService.trainStudentEmbeddings(studentPhotos);
      
      if (success) {
        res.json({ message: "Training completed successfully" });
      } else {
        res.status(500).json({ message: "Training failed" });
      }
    } catch (error) {
      res.status(500).json({ message: "Training error" });
    }
  });

  app.post("/api/face-recognition/process-batch", async (req, res) => {
    try {
      const { sessionId, images } = req.body;
      
      if (!sessionId || !images || !Array.isArray(images)) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      // Update session status to processing
      await storage.updateAttendanceSession(sessionId, { status: "processing" });

      // Process the batch of images
      const results = await faceRecognitionService.processBatchImages(images);

      // Update session with results
      await storage.updateAttendanceSession(sessionId, {
        status: "completed",
        totalImages: results.totalImages,
        totalFacesDetected: results.totalFacesDetected,
        totalStudentsRecognized: results.recognizedStudents.length,
        averageConfidence: results.averageConfidence
      });

      // Save recognition results and attendance records
      for (const result of results.results) {
        await storage.createRecognitionResult({
          sessionId,
          studentId: result.studentId,
          confidence: result.confidence,
          imageIndex: result.imageIndex,
          bbox: result.bbox
        });

        if (result.studentId) {
          await storage.createAttendanceRecord({
            sessionId,
            studentId: result.studentId,
            isPresent: true,
            confidence: result.confidence,
            detectionCount: 1
          });
        }
      }

      res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error("Batch processing error:", error);
      // Update session status to failed
      if (req.body.sessionId) {
        await storage.updateAttendanceSession(req.body.sessionId, { status: "failed" });
      }
      res.status(500).json({ message: "Batch processing failed" });
    }
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const students = await storage.getStudents();
      const classes = await storage.getClasses();
      const sessions = await storage.getAttendanceSessions();
      
      // Calculate today's attendance (simplified)
      const today = new Date();
      const todaySessions = sessions.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate.toDateString() === today.toDateString();
      });

      const todayAttendance = todaySessions.length > 0 
        ? Math.round(todaySessions.reduce((acc, session) => acc + (session.totalStudentsRecognized || 0), 0) / todaySessions.length)
        : 0;

      const stats = {
        totalStudents: students.length,
        todayAttendance: `${todayAttendance}%`,
        activeClasses: classes.filter(c => c.isActive).length,
        accuracy: sessions.length > 0 
          ? `${Math.round(sessions.reduce((acc, session) => acc + (session.averageConfidence || 0), 0) / sessions.length * 100)}%`
          : "0%"
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
