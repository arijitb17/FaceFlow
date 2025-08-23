import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

export interface FaceRecognitionResult {
  studentId?: string;
  studentName?: string;
  confidence: number;
  bbox: number[];
  imageIndex: number;
}

export interface BatchProcessingResult {
  totalImages: number;
  totalFacesDetected: number;
  recognizedStudents: string[];
  results: FaceRecognitionResult[];
  averageConfidence: number;
}

export class FaceRecognitionService {
  private workingDir: string;

  constructor() {
    this.workingDir = path.join(process.cwd(), 'temp_recognition');
  }

  async ensureWorkingDirectory(): Promise<void> {
    try {
      await fs.access(this.workingDir);
    } catch {
      await fs.mkdir(this.workingDir, { recursive: true });
    }
  }

  async trainStudentEmbeddings(studentPhotos: { [studentId: string]: string[] }): Promise<boolean> {
    try {
      await this.ensureWorkingDirectory();
      
      // Create dataset structure
      const datasetPath = path.join(this.workingDir, 'dataset');
      await fs.mkdir(datasetPath, { recursive: true });

      // Save student photos to appropriate folders
      for (const [studentId, photos] of Object.entries(studentPhotos)) {
        const studentDir = path.join(datasetPath, studentId);
        await fs.mkdir(studentDir, { recursive: true });
        
        for (let i = 0; i < photos.length; i++) {
          const photoPath = path.join(studentDir, `photo_${i}.jpg`);
          // Here you would save the base64 image data to file
          // await fs.writeFile(photoPath, Buffer.from(photos[i], 'base64'));
        }
      }

      // Run training script
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
          path.join(process.cwd(), 'attached_assets', 'train_1755929175701.py')
        ], {
          cwd: this.workingDir,
          stdio: 'pipe'
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`Training failed with code ${code}`));
          }
        });

        pythonProcess.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Training error:', error);
      return false;
    }
  }

  async processBatchImages(imageDataArray: string[]): Promise<BatchProcessingResult> {
    try {
      await this.ensureWorkingDirectory();
      
      // Create test-images directory
      const testImagesPath = path.join(this.workingDir, 'test-images');
      await fs.mkdir(testImagesPath, { recursive: true });

      // Save images to test directory
      for (let i = 0; i < imageDataArray.length; i++) {
        const imagePath = path.join(testImagesPath, `capture_${i}.jpg`);
        // Convert base64 to image file
        const base64Data = imageDataArray[i].replace(/^data:image\/[a-z]+;base64,/, '');
        await fs.writeFile(imagePath, Buffer.from(base64Data, 'base64'));
      }

      // Run recognition script
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
          path.join(process.cwd(), 'attached_assets', 'recognize_1755929175698.py')
        ], {
          cwd: this.workingDir,
          stdio: 'pipe'
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            // Parse the output to extract recognition results
            const results = this.parseRecognitionOutput(output);
            resolve(results);
          } else {
            reject(new Error(`Recognition failed: ${errorOutput}`));
          }
        });

        pythonProcess.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Batch processing error:', error);
      throw error;
    }
  }

  private parseRecognitionOutput(output: string): BatchProcessingResult {
    // This is a simplified parser - in reality, you'd need to modify
    // the Python script to output structured JSON data
    const lines = output.split('\n');
    const results: FaceRecognitionResult[] = [];
    const recognizedStudents = new Set<string>();
    let totalFacesDetected = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const line of lines) {
      if (line.includes('Faces Detected:')) {
        const match = line.match(/Faces Detected: (\d+)/);
        if (match) {
          totalFacesDetected += parseInt(match[1]);
        }
      }

      if (line.includes('Detected:') && line.includes('Similarity:')) {
        const nameMatch = line.match(/Detected: ([^(]+)/);
        const confidenceMatch = line.match(/Similarity: ([\d.]+)/);
        
        if (nameMatch && confidenceMatch) {
          const studentName = nameMatch[1].trim();
          const confidence = parseFloat(confidenceMatch[1]);
          
          if (studentName !== 'Unknown' && confidence > 0.4) {
            recognizedStudents.add(studentName);
            totalConfidence += confidence;
            confidenceCount++;
            
            results.push({
              studentName,
              confidence,
              bbox: [0, 0, 100, 100], // Placeholder - would be parsed from actual output
              imageIndex: 0 // Would be parsed from filename
            });
          }
        }
      }
    }

    return {
      totalImages: 20, // Fixed for now
      totalFacesDetected,
      recognizedStudents: Array.from(recognizedStudents),
      results,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0
    };
  }

  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.workingDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

export const faceRecognitionService = new FaceRecognitionService();
