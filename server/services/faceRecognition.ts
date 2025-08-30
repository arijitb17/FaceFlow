// Enhanced FaceRecognitionService with improved error handling and monitoring

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { storage } from "../storage";

interface TrainingProgress {
  isTraining: boolean;
  progress: number;
  message: string;
  startTime?: Date;
  estimatedCompletion?: Date;
}

export class EnhancedFaceRecognitionService {
  private datasetPath = path.join(process.cwd(), "dataset");
  private outputPath = path.join(process.cwd(), "output");
  private embeddingsPath = path.join(process.cwd(), "face_embeddings.pkl");
  private scriptsPath = path.join(process.cwd(), "attached_assets");
  private testImagesPath = path.join(process.cwd(), "test-images");
  
  private trainingStatus: TrainingProgress = {
    isTraining: false,
    progress: 0,
    message: "Ready to train"
  };

  constructor() {
    this.ensureDirectories();
    this.cleanupOldFiles();
  }

  private ensureDirectories() {
    [this.datasetPath, this.testImagesPath, this.outputPath, this.scriptsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
  }

  private cleanupOldFiles() {
    try {
      // Clean old test images (older than 1 hour)
      if (fs.existsSync(this.testImagesPath)) {
        const files = fs.readdirSync(this.testImagesPath);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        files.forEach(file => {
          const filePath = path.join(this.testImagesPath, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < oneHourAgo) {
            fs.unlinkSync(filePath);
          }
        });
      }

      // Clean old output files (older than 24 hours)
      if (fs.existsSync(this.outputPath)) {
        const files = fs.readdirSync(this.outputPath);
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        files.forEach(file => {
          const filePath = path.join(this.outputPath, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < oneDayAgo) {
            fs.unlinkSync(filePath);
          }
        });
      }
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  }

  /** Validate dataset before training */
  private async validateDataset(): Promise<{ isValid: boolean; errors: string[]; studentCount: number }> {
    const errors: string[] = [];
    let studentCount = 0;

    try {
      if (!fs.existsSync(this.datasetPath)) {
        errors.push("Dataset folder does not exist");
        return { isValid: false, errors, studentCount };
      }

      const studentFolders = fs.readdirSync(this.datasetPath)
        .filter(item => fs.statSync(path.join(this.datasetPath, item)).isDirectory());

      if (studentFolders.length === 0) {
        errors.push("No student folders found in dataset");
        return { isValid: false, errors, studentCount };
      }

      studentCount = studentFolders.length;

      // Validate each student folder
      studentFolders.forEach(folder => {
        const folderPath = path.join(this.datasetPath, folder);
        const images = fs.readdirSync(folderPath)
          .filter(file => /\.(jpg|jpeg|png)$/i.test(file));

        if (images.length === 0) {
          errors.push(`Student folder '${folder}' contains no valid images`);
        } else if (images.length < 2) {
          errors.push(`Student '${folder}' has only ${images.length} image(s). Minimum 2 recommended`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        studentCount
      };
    } catch (error) {
      errors.push(`Dataset validation failed: ${error}`);
      return { isValid: false, errors, studentCount };
    }
  }

  /** Enhanced training with better progress tracking */
  async trainModel(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Check if already training
      if (this.trainingStatus.isTraining) {
        return {
          success: false,
          message: "Training is already in progress"
        };
      }

      // Validate dataset
      const validation = await this.validateDataset();
      if (!validation.isValid) {
        return {
          success: false,
          message: "Dataset validation failed",
          details: { errors: validation.errors }
        };
      }

      // Check training script exists
      const pythonScriptPath = path.join(this.scriptsPath, "train_1755929175701.py");
      if (!fs.existsSync(pythonScriptPath)) {
        return {
          success: false,
          message: `Training script not found at: ${pythonScriptPath}`
        };
      }

      // Initialize training status
      this.trainingStatus = {
        isTraining: true,
        progress: 0,
        message: "Initializing training...",
        startTime: new Date()
      };

      console.log(`Starting training for ${validation.studentCount} students...`);

      return new Promise((resolve) => {
        const pythonProcess = spawn("python", [pythonScriptPath], { 
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = "";
        let stderr = "";
        let lastProgressUpdate = Date.now();

        pythonProcess.stdout.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          
          // Parse progress from Python output
          this.updateProgressFromOutput(text);
          
          console.log("[train.py]:", text.trim());
          lastProgressUpdate = Date.now();
        });

        pythonProcess.stderr.on("data", (data) => {
          const text = data.toString();
          stderr += text;
          console.error("[train.py stderr]:", text.trim());
        });

        // Timeout mechanism (10 minutes max)
        const timeout = setTimeout(() => {
          console.error("Training timeout reached");
          pythonProcess.kill();
          this.trainingStatus = {
            isTraining: false,
            progress: 0,
            message: "Training timed out"
          };
          resolve({
            success: false,
            message: "Training timed out after 10 minutes"
          });
        }, 10 * 60 * 1000);

        pythonProcess.on("close", async (code) => {
          clearTimeout(timeout);
          this.trainingStatus.isTraining = false;

          if (code === 0) {
            // Verify embeddings file was created
            if (fs.existsSync(this.embeddingsPath)) {
              try {
                // Mark all students with photos as trained
                const students = await storage.getStudents();
                const studentsWithPhotos = students.filter(s => s.photos && s.photos.length > 0);
                
                await Promise.all(
                  studentsWithPhotos.map(student =>
                    storage.updateStudent(student.id, { isTrainingComplete: true })
                  )
                );

                this.trainingStatus = {
                  isTraining: false,
                  progress: 100,
                  message: `Training completed successfully for ${studentsWithPhotos.length} students`
                };

                resolve({
                  success: true,
                  message: "Training completed successfully",
                  details: {
                    studentsTrained: studentsWithPhotos.length,
                    embeddingsFile: this.embeddingsPath
                  }
                });
              } catch (dbError) {
                console.error("Database update failed:", dbError);
                resolve({
                  success: false,
                  message: "Training completed but failed to update student records"
                });
              }
            } else {
              this.trainingStatus = {
                isTraining: false,
                progress: 0,
                message: "Training failed - no embeddings file generated"
              };
              
              resolve({
                success: false,
                message: "Training completed but no embeddings file was generated"
              });
            }
          } else {
            this.trainingStatus = {
              isTraining: false,
              progress: 0,
              message: `Training failed with exit code ${code}`
            };

            resolve({
              success: false,
              message: `Training failed with exit code ${code}`,
              details: { stderr: stderr.slice(-500) } // Last 500 chars of error
            });
          }
        });

        pythonProcess.on("error", (err) => {
          clearTimeout(timeout);
          this.trainingStatus = {
            isTraining: false,
            progress: 0,
            message: "Failed to start Python process"
          };

          console.error("Python process error:", err);
          resolve({
            success: false,
            message: `Failed to start Python process: ${err.message}`
          });
        });
      });

    } catch (error) {
      this.trainingStatus = {
        isTraining: false,
        progress: 0,
        message: "Training initialization failed"
      };

      console.error("trainModel error:", error);
      return {
        success: false,
        message: `Training initialization failed: ${error}`
      };
    }
  }

  private updateProgressFromOutput(output: string) {
    try {
      // Parse common progress indicators from Python output
      if (output.includes("Initializing face recognition")) {
        this.trainingStatus.progress = 10;
        this.trainingStatus.message = "Initializing face recognition model...";
      } else if (output.includes("Processing student:")) {
        // Estimate progress based on student processing
        const match = output.match(/Processing student:\s*(.+)/);
        if (match) {
          this.trainingStatus.progress = Math.min(90, this.trainingStatus.progress + 15);
          this.trainingStatus.message = `Processing student: ${match[1]}`;
        }
      } else if (output.includes("Training Complete")) {
        this.trainingStatus.progress = 95;
        this.trainingStatus.message = "Finalizing training...";
      } else if (output.includes("Embeddings saved")) {
        this.trainingStatus.progress = 100;
        this.trainingStatus.message = "Training completed successfully";
      }
    } catch (error) {
      console.warn("Progress parsing failed:", error);
    }
  }

  /** Enhanced live capture processing with better error handling */
  async processLiveCapture(base64Images: string[], sessionId?: string): Promise<{
    success: boolean;
    totalImages: number;
    totalFacesDetected: number;
    recognizedStudents: string[];
    averageConfidence: number;
    results: any[];
    errors?: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Validate inputs
      if (!base64Images || base64Images.length === 0) {
        return {
          success: false,
          totalImages: 0,
          totalFacesDetected: 0,
          recognizedStudents: [],
          averageConfidence: 0,
          results: [],
          errors: ["No images provided"]
        };
      }

      // Check if model is trained
      if (!fs.existsSync(this.embeddingsPath)) {
        return {
          success: false,
          totalImages: base64Images.length,
          totalFacesDetected: 0,
          recognizedStudents: [],
          averageConfidence: 0,
          results: [],
          errors: ["Face recognition model not trained. Please train the model first."]
        };
      }

      // Clean and prepare test images folder
      if (fs.existsSync(this.testImagesPath)) {
        const existingFiles = fs.readdirSync(this.testImagesPath);
        existingFiles.forEach(file => {
          try {
            fs.unlinkSync(path.join(this.testImagesPath, file));
          } catch (e) {
            console.warn(`Failed to delete old test image: ${file}`);
          }
        });
      }

      // Save incoming frames with validation
      const savedImages = [];
      for (let i = 0; i < base64Images.length; i++) {
        try {
          const b64 = base64Images[i];
          if (!b64 || typeof b64 !== 'string') {
            errors.push(`Invalid image data at index ${i}`);
            continue;
          }

          // Clean base64 string
          const cleanB64 = b64.replace(/^data:image\/[a-z]+;base64,/, "");
          const buffer = Buffer.from(cleanB64, "base64");
          
          if (buffer.length === 0) {
            errors.push(`Empty image buffer at index ${i}`);
            continue;
          }

          const filename = `frame_${String(i + 1).padStart(3, '0')}.jpg`;
          const filepath = path.join(this.testImagesPath, filename);
          fs.writeFileSync(filepath, buffer);
          savedImages.push(filename);
        } catch (error) {
          errors.push(`Failed to save image ${i}: ${error}`);
        }
      }

      if (savedImages.length === 0) {
        return {
          success: false,
          totalImages: base64Images.length,
          totalFacesDetected: 0,
          recognizedStudents: [],
          averageConfidence: 0,
          results: [],
          errors: ["No valid images could be saved"]
        };
      }

      console.log(`Saved ${savedImages.length}/${base64Images.length} images for processing`);

      // Execute recognition script
      return new Promise((resolve) => {
        const recognizeScript = path.join(this.scriptsPath, "recognize_1755929175698.py");
        
        if (!fs.existsSync(recognizeScript)) {
          resolve({
            success: false,
            totalImages: base64Images.length,
            totalFacesDetected: 0,
            recognizedStudents: [],
            averageConfidence: 0,
            results: [],
            errors: [`Recognition script not found: ${recognizeScript}`]
          });
          return;
        }

        const python = spawn("python", [recognizeScript], { 
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 5 * 60 * 1000 // 5 minute timeout
        });

        let stdout = "";
        let stderr = "";
        let isResolved = false;

        const timeout = setTimeout(() => {
          if (!isResolved) {
            python.kill();
            resolve({
              success: false,
              totalImages: base64Images.length,
              totalFacesDetected: 0,
              recognizedStudents: [],
              averageConfidence: 0,
              results: [],
              errors: ["Recognition process timed out"]
            });
            isResolved = true;
          }
        }, 5 * 60 * 1000);

        python.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        python.stderr.on("data", (data) => {
          const text = data.toString();
          stderr += text;
          if (!text.includes("Warning")) { // Ignore warnings
            console.error("[recognize.py stderr]:", text.trim());
          }
        });

       python.on("close", (code) => {
  clearTimeout(timeout);
  if (isResolved) return;
  isResolved = true;
  const stderrOutput = stderr.toString();

  if (code === 0) {
  try {
  // Extract the last JSON object from stdout
  const lines = stdout.split("\n").map(l => l.trim()).filter(Boolean);
  let jsonStr = "";
  
  // Find the line that starts with {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith("{")) {
      jsonStr = lines[i];
      break;
    }
  }

  if (!jsonStr) throw new Error("No JSON output found in Python stdout");

  const parsed = JSON.parse(jsonStr);

    // Build recognized students list from detections
    const recognizedStudentsSet = new Set<string>();
    (parsed.detections || []).forEach((d: { imageIndex: number; faceIndex: number; bbox: number[]; confidence: number; studentId: string }) => {
  if (d.studentId) recognizedStudentsSet.add(d.studentId);
});


    const outputData = {
      ...parsed,
      sessionId,
      timestamp: new Date().toISOString(),
      processedImages: savedImages.length,
      errors: errors.length > 0 ? errors : undefined
    };

    try {
      fs.writeFileSync(
        path.join(this.outputPath, `recognition-${sessionId || Date.now()}.json`),
        JSON.stringify(outputData, null, 2)
      );
    } catch (saveError) {
      console.error("Failed to save recognition results:", saveError);
    }

    resolve({
      success: true,
      totalImages: savedImages.length,
      totalFacesDetected: parsed.totalFaces || (parsed.detections || []).length,
      recognizedStudents: Array.from(recognizedStudentsSet),
      averageConfidence: parsed.averageConfidence || 0,
      results: parsed.detections || [],
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (parseError) {
    console.error("Failed to parse Python output:", parseError);
    console.error("Raw output:", stdout);
    console.error("Stderr:", stderr);

    resolve({
      success: false,
      totalImages: savedImages.length,
      totalFacesDetected: 0,
      recognizedStudents: [],
      averageConfidence: 0,
      results: [],
      errors: [`Failed to parse recognition results: ${parseError}`]
    });
  }
}
 else {
    console.error(`Recognition process failed with code ${code}`);
    console.error("Stderr:", stderrOutput);

    resolve({
      success: false,
      totalImages: savedImages.length,
      totalFacesDetected: 0,
      recognizedStudents: [],
      averageConfidence: 0,
      results: [],
      errors: [`Recognition process failed with exit code ${code}`, stderrOutput.slice(-200)]
    });
  }
});

python.on("error", (err) => {
  clearTimeout(timeout);
  if (isResolved) return;
  isResolved = true;

  console.error("Failed to spawn Python recognition process:", err);
  resolve({
    success: false,
    totalImages: savedImages.length,
    totalFacesDetected: 0,
    recognizedStudents: [],
    averageConfidence: 0,
    results: [],
    errors: [`Failed to start recognition process: ${err.message}`]
  });
});

      });

    } catch (error) {
      console.error("processLiveCapture error:", error);
      return {
        success: false,
        totalImages: base64Images.length,
        totalFacesDetected: 0,
        recognizedStudents: [],
        averageConfidence: 0,
        results: [],
        errors: [`Processing failed: ${error}`]
      };
    }
  }

  /** Get comprehensive training status */
  async getTrainingStatus() {
    try {
      const students = await storage.getStudents();
      const studentsWithPhotos = students.filter(s => s.photos && s.photos.length > 0);
      const trainedStudents = students.filter(s => s.isTrainingComplete);
      
      // Check if embeddings file exists and is recent
      let embeddingsInfo = null;
      if (fs.existsSync(this.embeddingsPath)) {
        const stats = fs.statSync(this.embeddingsPath);
        embeddingsInfo = {
          exists: true,
          size: stats.size,
          lastModified: stats.mtime,
          isRecent: (Date.now() - stats.mtime.getTime()) < (24 * 60 * 60 * 1000) // 24 hours
        };
      }

      return {
        ...this.trainingStatus,
        totalStudents: students.length,
        studentsWithPhotos: studentsWithPhotos.length,
        trainedStudents: trainedStudents.length,
        needsTraining: studentsWithPhotos.length > trainedStudents.length,
        embeddingsFile: embeddingsInfo,
        systemReady: !this.trainingStatus.isTraining && 
                    embeddingsInfo?.exists && 
                    trainedStudents.length > 0
      };
    } catch (error) {
      console.error("getTrainingStatus error:", error);
      return {
        isTraining: false,
        progress: 0,
        message: "Error getting training status",
        totalStudents: 0,
        studentsWithPhotos: 0,
        trainedStudents: 0,
        needsTraining: false,
        systemReady: false
      };
    }
  }

  /** Save student photos with enhanced validation */
  async saveStudentPhotosToDataset(studentId: string, name: string, base64Photos: string[]): Promise<{
    success: boolean;
    message: string;
    savedCount?: number;
    errors?: string[];
  }> {
    const errors: string[] = [];
    
    try {
      if (!base64Photos || base64Photos.length === 0) {
        return {
          success: false,
          message: "No photos provided"
        };
      }

      const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase();
      const studentFolder = path.join(this.datasetPath, sanitizedName);

      // Create student folder
      if (!fs.existsSync(studentFolder)) {
        fs.mkdirSync(studentFolder, { recursive: true });
      }

      // Remove old photos
      const existingFiles = fs.readdirSync(studentFolder);
      existingFiles.forEach(file => {
        try {
          fs.unlinkSync(path.join(studentFolder, file));
        } catch (e) {
          errors.push(`Failed to remove old file: ${file}`);
        }
      });

      // Save new photos with validation
      let savedCount = 0;
      for (let i = 0; i < base64Photos.length; i++) {
        try {
          const b64 = base64Photos[i];
          const cleanB64 = b64.replace(/^data:image\/[a-z]+;base64,/, "");
          const buffer = Buffer.from(cleanB64, "base64");

          if (buffer.length === 0) {
            errors.push(`Empty image buffer at index ${i}`);
            continue;
          }

          const filename = `${sanitizedName}_${String(i + 1).padStart(2, '0')}.jpg`;
          const filepath = path.join(studentFolder, filename);
          fs.writeFileSync(filepath, buffer);
          savedCount++;
        } catch (error) {
          errors.push(`Failed to save photo ${i + 1}: ${error}`);
        }
      }

      if (savedCount === 0) {
        return {
          success: false,
          message: "No photos could be saved",
          errors
        };
      }

      console.log(`Saved ${savedCount}/${base64Photos.length} photos for ${name}`);
      
      return {
        success: true,
        message: `Saved ${savedCount} photos for ${name}`,
        savedCount,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error("saveStudentPhotosToDataset error:", error);
      return {
        success: false,
        message: `Failed to save photos: ${error}`
      };
    }
  }

  /** Clear student dataset with verification */
  async clearStudentDataset(studentId: string, name: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, "_").toLowerCase();
      const folder = path.join(this.datasetPath, sanitizedName);
      
      if (fs.existsSync(folder)) {
        const files = fs.readdirSync(folder);
        fs.rmSync(folder, { recursive: true, force: true });
        console.log(`Cleared dataset for student: ${name} (${files.length} files removed)`);
        
        return {
          success: true,
          message: `Cleared ${files.length} files for ${name}`
        };
      } else {
        return {
          success: true,
          message: `No dataset folder found for ${name}`
        };
      }
    } catch (error) {
      console.error("clearStudentDataset error:", error);
      return {
        success: false,
        message: `Failed to clear dataset: ${error}`
      };
    }
  }

  /** Get system health check */
  async getSystemHealth() {
    try {
      const checks = {
        pythonAvailable: false,
        scriptsExist: false,
        embeddingsExist: false,
        directoriesExist: false,
        datasetValid: false
      };

      // Check Python availability
      try {
        await new Promise((resolve, reject) => {
          const python = spawn("python", ["--version"]);
          python.on("close", (code) => {
            checks.pythonAvailable = code === 0;
            resolve(code);
          });
          python.on("error", reject);
          setTimeout(() => reject(new Error("timeout")), 5000);
        });
      } catch (e) {
        checks.pythonAvailable = false;
      }

      // Check scripts exist
      const trainScript = path.join(this.scriptsPath, "train_1755929175701.py");
      const recognizeScript = path.join(this.scriptsPath, "recognize_1755929175698.py");
      checks.scriptsExist = fs.existsSync(trainScript) && fs.existsSync(recognizeScript);

      // Check embeddings file
      checks.embeddingsExist = fs.existsSync(this.embeddingsPath);

      // Check directories
      checks.directoriesExist = [
        this.datasetPath,
        this.testImagesPath,
        this.outputPath,
        this.scriptsPath
      ].every(dir => fs.existsSync(dir));

      // Check dataset validity
      const validation = await this.validateDataset();
      checks.datasetValid = validation.isValid;

      const allChecksPass = Object.values(checks).every(check => check === true);

      return {
        healthy: allChecksPass,
        checks,
        trainingStatus: this.trainingStatus,
        lastCheck: new Date()
      };
    } catch (error) {
      console.error("Health check failed:", error);
      return {
        healthy: false,
        checks: {},
        error: String(error),
        lastCheck: new Date()
      };
    }
  }
}

export const enhancedFaceRecognitionService = new EnhancedFaceRecognitionService();