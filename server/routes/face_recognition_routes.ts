// routes/faceRecognition.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { enhancedFaceRecognitionService } from "server/services/faceRecognition";
import { authenticateToken } from "./auth_routes";
import type { AuthRequest } from "./route_types";
import multer from "multer";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

// Multer config for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Training status tracking
let currentTrainingStatus = {
  isTraining: false,
  progress: 0,
  message: "Ready to train"
};

export function registerFaceRecognitionRoutes(app: Express) {

  /**
   * Upload student photos
   */
  app.post("/api/face-recognition/upload-student-photos",
    authenticateToken,
    upload.array("photos"),
    async (req: AuthRequest, res: Response) => {
      try {
        const studentId = req.body.studentId;
        const files = req.files as Express.Multer.File[];

        if (!studentId) return res.status(400).json({ success: false, message: "Student ID is required" });
        if (!files || files.length === 0) return res.status(400).json({ success: false, message: "At least one photo is required" });

        const student = await storage.getStudent(studentId);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        // Clear existing dataset
        await enhancedFaceRecognitionService.clearStudentDataset(student.id, student.name);

        const base64Photos: string[] = files
          .filter(f => f.buffer)
          .map(f => `data:${f.mimetype};base64,${f.buffer.toString("base64")}`);

        if (base64Photos.length === 0) return res.status(500).json({ success: false, message: "No valid photos to process" });

        const saved = await enhancedFaceRecognitionService.saveStudentPhotosToDataset(student.id, student.name, base64Photos);
        if (!saved) return res.status(500).json({ success: false, message: "Failed to save photos to dataset" });

        const updatedStudent = await storage.updateStudent(studentId, {
          photos: base64Photos,
          isTrainingComplete: false
        });

        res.json({
          success: true,
          message: `Uploaded ${base64Photos.length} photos for ${student.name}`,
          student: updatedStudent,
          photosCount: base64Photos.length,
          datasetPath: `dataset/${student.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase()}`
        });

      } catch (error) {
        console.error("Upload student photos error:", error);
        res.status(500).json({ success: false, message: "Failed to upload photos", error: String(error) });
      }
    }
  );

  /**
   * Training status
   */
  app.get("/api/face-recognition/training-status",
    authenticateToken,
    async (_req, res) => {
      try {
        const students = await storage.getStudents();
        const studentsWithPhotos = students.filter(s => s.photos?.length).length;
        const trainedStudents = students.filter(s => s.isTrainingComplete).length;

        res.set('Cache-Control', 'no-store');
        res.json({
          isTraining: currentTrainingStatus.isTraining,
          progress: currentTrainingStatus.progress,
          message: currentTrainingStatus.message,
          totalStudents: students.length,
          studentsWithPhotos,
          trainedStudents,
          needsTraining: studentsWithPhotos > trainedStudents
        });
      } catch (error) {
        console.error("Training status error:", error);
        res.status(500).json({ message: "Failed to get training status" });
      }
    }
  );

  /**
   * Start Python-based training
   */
  app.post("/api/face-recognition/train-model",
    authenticateToken,
    async (_req, res) => {
      try {
        if (currentTrainingStatus.isTraining) {
          return res.status(409).json({ success: false, message: "Training already in progress", status: currentTrainingStatus });
        }

        const datasetPath = path.join(process.cwd(), "dataset");
        if (!fs.existsSync(datasetPath)) return res.status(400).json({ success: false, message: "Dataset folder not found" });

        const studentFolders = fs.readdirSync(datasetPath).filter(f => fs.statSync(path.join(datasetPath, f)).isDirectory());
        if (studentFolders.length === 0) return res.status(400).json({ success: false, message: "No student folders found" });

        currentTrainingStatus = { isTraining: true, progress: 0, message: "Initializing training..." };

        const pythonScriptPath = path.join(process.cwd(), "attached_assets", "train_1755929175701.py");
        if (!fs.existsSync(pythonScriptPath)) throw new Error("Training script not found");

        const pythonProcess = spawn("python", [pythonScriptPath]);
        let processedStudents = 0;

        pythonProcess.stdout.on("data", data => {
          const text = data.toString().trim();
          console.log("Python:", text);

          if (text.startsWith("Processing student:")) {
            processedStudents++;
            currentTrainingStatus.progress = Math.floor((processedStudents / studentFolders.length) * 100);
            currentTrainingStatus.message = `Processing student ${processedStudents} of ${studentFolders.length}`;
          }

          if (text.includes("Training Complete")) {
            currentTrainingStatus.progress = 100;
            currentTrainingStatus.message = "Training Complete";
          }
        });

        pythonProcess.stderr.on("data", data => console.error("Python Error:", data.toString()));

        pythonProcess.on("close", async code => {
          if (code === 0) {
            // Mark trained students
            const students = await storage.getStudents();
            for (const student of students) {
              const folderName = student.name.replace(/[^a-zA-Z0-9\-_]/g, "_").toLowerCase();
              if (studentFolders.includes(folderName)) {
                await storage.updateStudent(student.id, { isTrainingComplete: true });
              }
            }
            currentTrainingStatus = { isTraining: false, progress: 100, message: "Training completed successfully" };
            console.log("All students with photos marked as trained");
          } else {
            currentTrainingStatus = { isTraining: false, progress: 0, message: "Training failed" };
            console.error("Python training process exited with code", code);
          }
        });

        res.json({ success: true, message: `Training started for ${studentFolders.length} students`, status: currentTrainingStatus });

      } catch (error) {
        console.error("Training init error:", error);
        currentTrainingStatus = { isTraining: false, progress: 0, message: "Training failed to start" };
        res.status(500).json({ success: false, message: "Failed to start training" });
      }
    }
  );

  /**
   * Process live captured images for attendance
   */
  app.post("/api/face-recognition/process-batch", async (req: Request, res: Response) => {
  try {
    const { sessionId, images } = req.body;
    if (!sessionId || !images?.length) {
      return res.status(400).json({ message: "Session ID and images array are required" });
    }

    const session = await storage.getAttendanceSession(sessionId);
    if (!session) return res.status(404).json({ message: "Attendance session not found" });

    // Mark session as processing
    await storage.updateAttendanceSession(sessionId, { status: "processing" });
    console.log(`Processing ${images.length} live capture images for session ${sessionId}...`);

    // Process images with face recognition service
    const results = await enhancedFaceRecognitionService.processLiveCapture(images);

    // Save raw results
    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
      path.join(outputDir, `recognition-${sessionId}.json`),
      JSON.stringify(results, null, 2)
    );

    // Normalize function to map labels consistently
    const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

    // Build map of students by normalized name
    const students = await storage.getStudents();
    const nameMap = new Map(students.map(s => [normalize(s.name), s]));

    const attendanceMap = new Map<
      string,
      { studentId: string; confidence: number; detectionCount: number }
    >();

    for (const result of results.results) {
      const label = normalize(result.label || result.studentId || "");
      const student = nameMap.get(label);

      if (!student) {
        console.warn("No matching student for label:", result.label);
        continue;
      }

      // Save each recognition result
      await storage.createRecognitionResult({
        sessionId,
        studentId: student.id,
        confidence: result.confidence || 0,
        imageIndex: result.imageIndex || 0,
        bbox: result.bbox || [],
      });

      // Aggregate attendance
      if (!attendanceMap.has(student.id) || attendanceMap.get(student.id)!.confidence < (result.confidence || 0)) {
        attendanceMap.set(student.id, {
          studentId: student.id,
          confidence: result.confidence || 0,
          detectionCount: 1,
        });
      } else {
        const existing = attendanceMap.get(student.id)!;
        existing.detectionCount++;
        attendanceMap.set(student.id, existing);
      }
    }

    // Create attendance records
    const attendanceRecords = [];
    for (const [studentId, record] of attendanceMap) {
      const attendanceRecord = await storage.createAttendanceRecord({
        sessionId,
        studentId: record.studentId,
        isPresent: true,
        confidence: record.confidence,
        detectionCount: record.detectionCount,
      });
      attendanceRecords.push(attendanceRecord);
    }

    // Update session summary
    await storage.updateAttendanceSession(sessionId, {
      status: "completed",
      totalImages: results.totalImages,
      totalFacesDetected: results.totalFacesDetected,
      totalStudentsRecognized: results.recognizedStudents.length,
      averageConfidence: results.averageConfidence,
    });

    console.log(`Attendance marked for ${attendanceRecords.length} students`);

    res.json({
      success: true,
      results: {
        totalImages: results.totalImages,
        totalFacesDetected: results.totalFacesDetected,
        recognizedStudents: Array.from(attendanceMap.keys()),
        averageConfidence: results.averageConfidence,
        attendanceRecords: attendanceRecords.length,
        sessionId,
      },
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

  /**
   * Get student photos
   */
  app.get("/api/face-recognition/student-photos/:studentId",
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const { studentId } = req.params;
        const student = await storage.getStudent(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });

        const folderName = student.name.replace(/[^a-zA-Z0-9\-_]/g, "_").toLowerCase();
        const folderPath = path.join(process.cwd(), "dataset", folderName);

        const photos = fs.existsSync(folderPath)
          ? fs.readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).map(f => `/datasets/${folderName}/${f}`)
          : [];

        res.json({
          studentId: student.id,
          studentName: student.name,
          photos,
          photosCount: photos.length,
          isTrainingComplete: student.isTrainingComplete || false,
          datasetFolder: folderName
        });

      } catch (error) {
        console.error("Get student photos error:", error);
        res.status(500).json({ message: "Failed to get student photos" });
      }
    }
  );

  /**
   * Delete student photos
   */
  app.delete("/api/face-recognition/student-photos/:studentId",
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const { studentId } = req.params;
        const student = await storage.getStudent(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });

        await storage.updateStudent(studentId, { photos: [], isTrainingComplete: false });
        await enhancedFaceRecognitionService.clearStudentDataset(student.id, student.name);

        res.json({ success: true, message: `Cleared photos for ${student.name}`, studentId });

      } catch (error) {
        console.error("Delete student photos error:", error);
        res.status(500).json({ message: "Failed to delete student photos" });
      }
    }
  );

  /**
   * Get overall face recognition statistics
   */
  app.get("/api/face-recognition/stats",
    authenticateToken,
    async (_req: AuthRequest, res: Response) => {
      try {
        const [sessions, students] = await Promise.all([storage.getAttendanceSessions(), storage.getStudents()]);
        const completedSessions = sessions.filter(s => s.status === 'completed');
        const totalRecognitions = completedSessions.reduce((sum, s) => sum + (s.totalStudentsRecognized || 0), 0);
        const avgConfidence = completedSessions.length
          ? completedSessions.reduce((sum, s) => sum + (s.averageConfidence || 0), 0) / completedSessions.length
          : 0;

        res.json({
          training: currentTrainingStatus,
          recognition: {
            totalSessions: sessions.length,
            completedSessions: completedSessions.length,
            totalRecognitions,
            averageConfidence: Math.round(avgConfidence * 100),
            processingStatus: sessions.some(s => s.status === 'processing') ? 'processing' : 'idle'
          },
          students: {
            total: students.length,
            withPhotos: students.filter(s => s.photos?.length).length,
            trained: students.filter(s => s.isTrainingComplete).length
          }
        });

      } catch (error) {
        console.error("Get face recognition stats error:", error);
        res.status(500).json({ message: "Failed to get statistics" });
      }
    }
  );

}
