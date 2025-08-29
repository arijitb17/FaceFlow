// routes/faceRecognition.ts - Enhanced with dataset integration + fixes
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { faceRecognitionService } from "../services/faceRecognition";
import { authenticateToken } from "./auth_routes";
import type { AuthRequest } from "./route_types";
import multer from "multer";
import fs from "fs";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export function registerFaceRecognitionRoutes(app: Express) {
  
  // Upload student photos and save to dataset
  app.post(
    "/api/face-recognition/upload-student-photos",
    authenticateToken,
    upload.array("photos"),
    async (req: AuthRequest, res: Response) => {
      try {
        const studentId = req.body.studentId;
        const files = req.files as Express.Multer.File[];

        if (!studentId) {
          return res.status(400).json({ success: false, message: "Student ID is required" });
        }

        if (!files || files.length === 0) {
          return res.status(400).json({ success: false, message: "At least one photo is required" });
        }

        // Get student details
        const student = await storage.getStudent(studentId);
        if (!student) {
          return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Clear existing dataset folder for this student
        await faceRecognitionService.clearStudentDataset(student.id, student.name);

        // Convert files to base64
        const base64Photos: string[] = [];
        for (const file of files) {
          if (!file.buffer) continue;
          base64Photos.push(`data:${file.mimetype};base64,${file.buffer.toString("base64")}`);
        }

        if (base64Photos.length === 0) {
          return res.status(500).json({ success: false, message: "No valid photos to process" });
        }

        // Save photos to dataset folder structure
        const datasetSaved = await faceRecognitionService.saveStudentPhotosToDataset(
          student.id, 
          student.name, 
          base64Photos
        );

        if (!datasetSaved) {
          return res.status(500).json({ 
            success: false, 
            message: "Failed to save photos to dataset" 
          });
        }

        // Update student record with photos
        const updatedStudent = await storage.updateStudent(studentId, {
          photos: base64Photos,
          isTrainingComplete: false, // Mark as needing retraining
        });

        res.json({
          success: true,
          message: `Uploaded ${base64Photos.length} photos for ${student.name}`,
          student: updatedStudent,
          photosCount: base64Photos.length,
          datasetPath: `dataset/${student.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase()}`,
        });

      } catch (error) {
        console.error("Upload student photos error:", error);
        res.status(500).json({ 
          success: false, 
          message: "Failed to upload photos", 
          error: String(error) 
        });
      }
    }
  );

  // Train all students model
  app.post("/api/face-recognition/train-all", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const students = await storage.getStudents();
      const studentsWithPhotos = students.filter(s => s.photos && s.photos.length > 0);

      if (studentsWithPhotos.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: "No students with photos found. Please upload student photos first." 
        });
      }

      console.log(`Training model with ${studentsWithPhotos.length} students...`);
      
      const success = await faceRecognitionService.trainModel();

      if (success) {
        // Mark all as trained
        await Promise.all(studentsWithPhotos.map(s => 
          storage.updateStudent(s.id, { isTrainingComplete: true })
        ));

        res.json({ 
          success: true, 
          message: `Successfully trained model with ${studentsWithPhotos.length} students`,
          trainedCount: studentsWithPhotos.length
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Model training failed. Check server logs for details." 
        });
      }
    } catch (error) {
      console.error("Model training error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Training error occurred" 
      });
    }
  });

  // Train specific students
  app.post("/api/face-recognition/train-students", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { studentIds } = req.body;
      
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "Student IDs array is required" });
      }

      const success = await faceRecognitionService.retrainStudents(studentIds);
      
      if (success) {
        // Mark retrained students as trained
        await Promise.all(studentIds.map(id => 
          storage.updateStudent(id, { isTrainingComplete: true })
        ));

        res.json({ 
          success: true, 
          message: `Successfully retrained ${studentIds.length} students`,
          retrainedCount: studentIds.length
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Student retraining failed" 
        });
      }
    } catch (error) {
      console.error("Student retraining error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Retraining error occurred"
      });
    }
  });

  // Process live capture batch for attendance
  app.post("/api/face-recognition/process-batch", async (req: Request, res: Response) => {
    try {
      const { sessionId, images } = req.body;
      
      if (!sessionId || !images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: "Session ID and images array are required" });
      }

      const session = await storage.getAttendanceSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Attendance session not found" });
      }

      await storage.updateAttendanceSession(sessionId, { status: "processing" });
      
      console.log(`Processing ${images.length} live capture images for session ${sessionId}...`);
      
      const results = await faceRecognitionService.processLiveCapture(images);

      // Save raw results to /output for debugging
      fs.writeFileSync(
        path.join(process.cwd(), "output", `recognition-${sessionId}.json`),
        JSON.stringify(results, null, 2)
      );

      await storage.updateAttendanceSession(sessionId, {
        status: "completed",
        totalImages: results.totalImages,
        totalFacesDetected: results.totalFacesDetected,
        totalStudentsRecognized: results.recognizedStudents.length,
        averageConfidence: results.averageConfidence
      });

      const students = await storage.getStudents();
      const nameMap = new Map(
        students.map(s => [s.name.replace(/[^a-zA-Z0-9\-_]/g, "_").toLowerCase(), s])
      );

      const attendanceMap = new Map<string, {
        studentId: string;
        confidence: number;
        detectionCount: number;
      }>();

      for (const result of results.results) {
        const label = (result.label || result.studentId || "").toLowerCase();
        const student = nameMap.get(label);
        if (!student) continue;

        await storage.createRecognitionResult({
          sessionId,
          studentId: student.id,
          confidence: result.confidence || 0,
          imageIndex: result.imageIndex || 0,
          bbox: result.bbox || []
        });

        if (!attendanceMap.has(student.id) || 
            attendanceMap.get(student.id)!.confidence < (result.confidence || 0)) {
          attendanceMap.set(student.id, {
            studentId: student.id,
            confidence: result.confidence || 0,
            detectionCount: 1
          });
        } else {
          const existing = attendanceMap.get(student.id)!;
          existing.detectionCount++;
          attendanceMap.set(student.id, existing);
        }
      }

      const attendanceRecords = [];
      for (const [studentId, record] of attendanceMap) {
        const attendanceRecord = await storage.createAttendanceRecord({
          sessionId,
          studentId: record.studentId,
          isPresent: true,
          confidence: record.confidence,
          detectionCount: record.detectionCount
        });
        attendanceRecords.push(attendanceRecord);
      }

      console.log(`Completed processing: ${results.recognizedStudents.length} students recognized`);
      console.log(`Attendance marked for ${attendanceRecords.length} students`);

      res.json({ 
        success: true, 
        results: {
          totalImages: results.totalImages,
          totalFacesDetected: results.totalFacesDetected,
          recognizedStudents: results.recognizedStudents,
          averageConfidence: results.averageConfidence,
          attendanceRecords: attendanceRecords.length,
          sessionId
        }
      });

    } catch (error) {
      console.error("Live capture processing error:", error);
      if (req.body.sessionId) {
        try {
          await storage.updateAttendanceSession(req.body.sessionId, { status: "failed" });
        } catch (updateError) {
          console.error("Failed to update session status:", updateError);
        }
      }
      res.status(500).json({ success: false, message: "Live capture processing failed" });
    }
  });

  // Get training status
  app.get("/api/face-recognition/training-status", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const status = await faceRecognitionService.getTrainingStatus();
      res.json(status);
    } catch (error) {
      console.error("Get training status error:", error);
      res.status(500).json({ message: "Failed to get training status" });
    }
  });

  // Get student photos
  app.get("/api/face-recognition/student-photos/:studentId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { studentId } = req.params;
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json({
        studentId: student.id,
        studentName: student.name,
        photos: student.photos || [],
        photosCount: student.photos?.length || 0,
        isTrainingComplete: student.isTrainingComplete || false,
        datasetFolder: student.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase()
      });

    } catch (error) {
      console.error("Get student photos error:", error);
      res.status(500).json({ message: "Failed to get student photos" });
    }
  });

  // Clear student photos and dataset
  app.delete("/api/face-recognition/student-photos/:studentId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { studentId } = req.params;
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      await storage.updateStudent(studentId, { photos: [], isTrainingComplete: false });
      await faceRecognitionService.clearStudentDataset(student.id, student.name);

      res.json({
        success: true,
        message: `Cleared photos for ${student.name}`,
        studentId
      });

    } catch (error) {
      console.error("Delete student photos error:", error);
      res.status(500).json({ message: "Failed to delete student photos" });
    }
  });

  // Get face recognition statistics
  app.get("/api/face-recognition/stats", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const [trainingStatus, sessions, students] = await Promise.all([
        faceRecognitionService.getTrainingStatus(),
        storage.getAttendanceSessions(),
        storage.getStudents()
      ]);

      const completedSessions = sessions.filter(s => s.status === 'completed');
      const totalRecognitions = completedSessions.reduce((sum, s) => sum + (s.totalStudentsRecognized || 0), 0);
      const avgConfidence = completedSessions.length > 0 
        ? completedSessions.reduce((sum, s) => sum + (s.averageConfidence || 0), 0) / completedSessions.length
        : 0;

      res.json({
        training: trainingStatus,
        recognition: {
          totalSessions: sessions.length,
          completedSessions: completedSessions.length,
          totalRecognitions,
          averageConfidence: Math.round(avgConfidence * 100),
          processingStatus: sessions.some(s => s.status === 'processing') ? 'processing' : 'idle'
        },
        students: {
          total: students.length,
          withPhotos: students.filter(s => s.photos && s.photos.length > 0).length,
          trained: students.filter(s => s.isTrainingComplete).length
        }
      });
    } catch (error) {
      console.error("Get face recognition stats error:", error);
      res.status(500).json({ message: "Failed to get statistics" });
    }
  });
}
