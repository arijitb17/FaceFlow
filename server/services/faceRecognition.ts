// server/services/faceRecognition.ts
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { storage } from "../storage";

export class FaceRecognitionService {
  private readonly datasetPath = path.join(process.cwd(), "dataset");
  private readonly testImagesPath = path.join(process.cwd(), "test-images");
  private readonly outputPath = path.join(process.cwd(), "output");
  private readonly scriptsPath = path.join(process.cwd(), "scripts");
  private isTraining = false;

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    [this.datasetPath, this.testImagesPath, this.outputPath, this.scriptsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Save student photos to dataset folder structure
   */
  async saveStudentPhotosToDataset(studentId: string, name: string, base64Photos: string[]): Promise<boolean> {
    try {
      // Create student folder using their name (sanitized)
      const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase();
      const studentFolder = path.join(this.datasetPath, sanitizedName);
      
      if (!fs.existsSync(studentFolder)) {
        fs.mkdirSync(studentFolder, { recursive: true });
      }

      // Clear existing photos
      const existingFiles = fs.readdirSync(studentFolder);
      existingFiles.forEach(file => {
        fs.unlinkSync(path.join(studentFolder, file));
      });

      // Save new photos
      for (let i = 0; i < base64Photos.length; i++) {
        const base64Data = base64Photos[i].replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${sanitizedName}_${i + 1}.jpg`;
        const filepath = path.join(studentFolder, filename);
        fs.writeFileSync(filepath, buffer);
      }

      console.log(`Saved ${base64Photos.length} photos for ${name} in dataset/${sanitizedName}`);
      return true;
    } catch (error) {
      console.error(`Error saving photos for ${name}:`, error);
      return false;
    }
  }

  /**
   * Train the face recognition model with all students in dataset
   */
  async trainModel(): Promise<boolean> {
    if (this.isTraining) {
      console.log("Training already in progress");
      return false;
    }

    try {
      this.isTraining = true;
      console.log("Starting face recognition model training...");

      return new Promise((resolve) => {
        const trainScript = path.join(this.scriptsPath, "train.py");
        const pythonProcess = spawn("python", [trainScript], {
          cwd: process.cwd(),
        });

        let output = "";
        let errorOutput = "";

        pythonProcess.stdout.on("data", (data) => {
          output += data.toString();
          console.log("Training output:", data.toString());
        });

        pythonProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
          console.error("Training error:", data.toString());
        });

        pythonProcess.on("close", async (code) => {
          this.isTraining = false;
          
          if (code === 0) {
            console.log("Training completed successfully");
            
            // Mark all students with photos as trained
            try {
              const students = await storage.getStudents();
              const studentsWithPhotos = students.filter(s => s.photos && s.photos.length > 0);
              
              for (const student of studentsWithPhotos) {
                await storage.updateStudent(student.id, { isTrainingComplete: true });
              }
              
              console.log(`Marked ${studentsWithPhotos.length} students as trained`);
            } catch (dbError) {
              console.error("Error updating student training status:", dbError);
            }
            
            resolve(true);
          } else {
            console.error(`Training failed with code ${code}`);
            console.error("Error output:", errorOutput);
            resolve(false);
          }
        });

        pythonProcess.on("error", (error) => {
          this.isTraining = false;
          console.error("Failed to start training process:", error);
          resolve(false);
        });
      });
    } catch (error) {
      this.isTraining = false;
      console.error("Training error:", error);
      return false;
    }
  }

  /**
   * Process live capture frames and recognize faces
   */
async processLiveCapture(base64Images: string[], sessionId?: string): Promise<{
  totalImages: number;
  totalFacesDetected: number;
  recognizedStudents: string[]; // labels from recognize.py (dataset folder names)
  averageConfidence: number;
  results: any[];               // per-face detections
}> {
  try {
    // reset test-images
    if (fs.existsSync(this.testImagesPath)) {
      for (const f of fs.readdirSync(this.testImagesPath)) {
        fs.unlinkSync(path.join(this.testImagesPath, f));
      }
    }

    // save incoming frames
    base64Images.forEach((b64, i) => {
      const buf = Buffer.from(b64.replace(/^data:image\/[a-z]+;base64,/, ""), "base64");
      fs.writeFileSync(path.join(this.testImagesPath, `frame_${i + 1}.jpg`), buf);
    });

    return await new Promise((resolve) => {
      const recognizeScript = path.join(this.scriptsPath, "recognize.py");
      const python = spawn("python", [recognizeScript], { cwd: process.cwd() });

      let out = "";
      let err = "";

      python.stdout.on("data", (d) => (out += d.toString()));
      python.stderr.on("data", (d) => {
        err += d.toString();
        console.error("[recognize.py]", d.toString());
      });

      const finalize = (payload: any) => {
        try {
          // store a copy to /output for auditing
          const filename = `recognition-${sessionId || Date.now()}.json`;
          fs.writeFileSync(path.join(this.outputPath, filename), JSON.stringify(payload, null, 2));
        } catch (e) {
          console.error("Failed to persist recognition JSON:", e);
        }

        resolve({
          totalImages: payload.processedImages ?? base64Images.length,
          totalFacesDetected: payload.totalFaces ?? 0,
          recognizedStudents: payload.recognizedStudents ?? [],
          averageConfidence: payload.averageConfidence ?? 0,
          results: payload.detections ?? [],
        });
      };

      python.on("close", (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(out.trim());
            finalize(parsed);
          } catch (e) {
            console.error("Parse error:", e);
            finalize({});
          }
        } else {
          console.error(`recognize.py exit code ${code}`, err);
          finalize({});
        }
      });

      python.on("error", (e) => {
        console.error("Spawn error:", e);
        finalize({});
      });
    });
  } catch (e) {
    console.error("processLiveCapture error:", e);
    return {
      totalImages: base64Images.length,
      totalFacesDetected: 0,
      recognizedStudents: [],
      averageConfidence: 0,
      results: [],
    };
  }
}
  /**
   * Clear a student's dataset folder completely
   */
  async clearStudentDataset(studentId: string, name: string): Promise<boolean> {
    try {
      const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, "_").toLowerCase();
      const studentFolder = path.join(this.datasetPath, sanitizedName);

      if (fs.existsSync(studentFolder)) {
        // remove all files first
        for (const file of fs.readdirSync(studentFolder)) {
          fs.unlinkSync(path.join(studentFolder, file));
        }
        // then remove the folder itself
        fs.rmdirSync(studentFolder, { recursive: true });
      }

      console.log(`Cleared dataset folder for student: ${name} (${studentId})`);
      return true;
    } catch (error) {
      console.error(`Error clearing dataset for ${name}:`, error);
      return false;
    }
  }


  /**
   * Get training status
   */
  async getTrainingStatus() {
    const students = await storage.getStudents();
    const studentsWithPhotos = students.filter(s => s.photos && s.photos.length > 0);
    const trainedStudents = students.filter(s => s.isTrainingComplete);

    return {
      isTraining: this.isTraining,
      totalStudents: students.length,
      studentsWithPhotos: studentsWithPhotos.length,
      trainedStudents: trainedStudents.length,
      needsTraining: studentsWithPhotos.length > trainedStudents.length,
      progress: this.isTraining ? 50 : 100 // Simple progress indication
    };
  }

  /**
   * Process batch images (alias for live capture)
   */
  async processBatchImages(images: string[]) {
    return this.processLiveCapture(images);
  }

  /**
   * Train specific students
   */
  async trainStudentEmbeddings(studentPhotos: { studentId: string; photos: string[] }[]): Promise<boolean> {
    try {
      // Save student photos to dataset first
      for (const { studentId, photos } of studentPhotos) {
        const student = await storage.getStudent(studentId);
        if (student) {
          await this.saveStudentPhotosToDataset(studentId, student.name, photos);
        }
      }

      // Run full model training
      return await this.trainModel();
    } catch (error) {
      console.error("Error training student embeddings:", error);
      return false;
    }
  }

  /**
   * Retrain specific students
   */
  async retrainStudents(studentIds: string[]): Promise<boolean> {
    try {
      const studentPhotos = [];
      
      for (const studentId of studentIds) {
        const student = await storage.getStudent(studentId);
        if (student && student.photos && student.photos.length > 0) {
          studentPhotos.push({
            studentId: student.id,
            photos: student.photos
          });
        }
      }

      if (studentPhotos.length === 0) {
        console.log("No students with photos found for retraining");
        return false;
      }

      return await this.trainStudentEmbeddings(studentPhotos);
    } catch (error) {
      console.error("Error retraining students:", error);
      return false;
    }
  }
}

export const faceRecognitionService = new FaceRecognitionService();