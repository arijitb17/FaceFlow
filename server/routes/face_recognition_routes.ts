// routes/faceRecognition.ts
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { faceRecognitionService } from "../services/faceRecognition";

export function registerFaceRecognitionRoutes(app: Express) {
  // Train face recognition model
  app.post("/api/face-recognition/train", async (req: Request, res: Response) => {
    try {
      const { studentPhotos } = req.body;
      if (!studentPhotos) {
        return res.status(400).json({ message: "No student photos provided" });
      }

      const success = await faceRecognitionService.trainStudentEmbeddings(studentPhotos);
      res.json({ success });
    } catch (error) {
      console.error("Face recognition training error:", error);
      res.status(500).json({ message: "Training error" });
    }
  });

  // Process batch images for attendance
  app.post("/api/face-recognition/process-batch", async (req: Request, res: Response) => {
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
        if (!result.studentId) continue;
        
        // Save recognition result
        await storage.createRecognitionResult({
          sessionId,
          studentId: result.studentId,
          confidence: result.confidence,
          imageIndex: result.imageIndex,
          bbox: result.bbox
        });

        // Save attendance record
        await storage.createAttendanceRecord({
          sessionId,
          studentId: result.studentId,
          isPresent: true,
          confidence: result.confidence,
          detectionCount: 1
        });
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Batch processing error:", error);
      
      // Update session status to failed if error occurs
      if (req.body.sessionId) {
        await storage.updateAttendanceSession(req.body.sessionId, { status: "failed" });
      }
      
      res.status(500).json({ message: "Batch processing failed" });
    }
  });
}