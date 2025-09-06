"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/stats/stats-cards";
import BatchProcessingModal from "@/components/attendance/batch-processing-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Brain, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

// Types
interface Student {
  id: string;
  name: string;
  studentId: string;
  photos: string[];
  isTrainingComplete: boolean;
  datasetFolderExists?: boolean;
}

interface TrainingStatus {
  isTraining: boolean;
  progress: number;
  totalStudents: number;
  studentsWithPhotos: number;
  trainedStudents: number;
  needsTraining: boolean;
}

interface ProcessingResults {
  totalImages: number;
  totalFacesDetected: number;
  recognizedStudents: string[];
  averageConfidence: number;
  sessionId: string;
}

export default function ModelTraining() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [batchResults, setBatchResults] = useState<ProcessingResults | null>(null);

  // JSON-safe wrapper
  const parseJsonSafely = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.warn("Response not valid JSON, returning fallback:", text);
      return { 
        success: res.ok, 
        message: text, 
        status: { isTraining: false, progress: 0, message: text } 
      };
    }
  };

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students");
      const json = await parseJsonSafely(res);
      if (!json.students) return [];

      return await Promise.all(
        json.students.map(async (s: any) => {
          const photosArray = Array.isArray(s.photos) ? s.photos : [];
          let datasetFolderExists = photosArray.length > 0;
          try {
            const folderRes = await apiRequest("GET", `/api/face-recognition/student-photos/${s.id}`);
            const folderJson = await parseJsonSafely(folderRes);
            const photosCount = Array.isArray(folderJson.photos) ? folderJson.photos.length : 0;
            datasetFolderExists = datasetFolderExists || photosCount > 0;
          } catch {
            datasetFolderExists = datasetFolderExists || false;
          }
          return {
            ...s,
            photos: photosArray,
            datasetFolderExists,
            isTrainingComplete: Boolean(s.isTrainingComplete),
          };
        })
      );
    },
    refetchInterval: 5000,
  });

  // Fetch training status
  const { data: trainingStatus } = useQuery<TrainingStatus>({
    queryKey: ["training-status"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/face-recognition/training-status");
        return await parseJsonSafely(res);
      } catch {
        return {
          isTraining: false,
          progress: 0,
          totalStudents: 0,
          studentsWithPhotos: 0,
          trainedStudents: 0,
          needsTraining: false,
        };
      }
    },
    refetchInterval: 2000,
  });

  // Training mutation
  const trainModelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/face-recognition/train-model");
      const json = await parseJsonSafely(res);
      if (!res.ok) {
        throw new Error(json?.message || "Training failed");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["training-status"] });
    },
    onError: (error: any) => {
      console.error("Training failed:", error?.message ?? error);
    },
  });

  const studentsWithPhotos = students.filter(s => s.photos.length > 0 || s.datasetFolderExists);
  const untrainedStudents = studentsWithPhotos.filter(s => !s.isTrainingComplete);
  const trainedStudents = students.filter(s => s.isTrainingComplete);

  // Stats for cards
 const stats = {
  totalStudents: students.length,
  todayAttendance: 0,                       // default or calculate actual
  activeClasses: studentsWithPhotos.length,
  accuracy: trainedStudents.length / (students.length || 1), // ratio 0-1
  totalSessions: 0,                         // placeholder, replace with real data if available
  completedSessions: trainedStudents.length,
  avgStudentsPerClass: students.length / (studentsWithPhotos.length || 1),
};


  // Demo/test handler
  const handleBatchProcessingComplete = () => {
    if (studentsWithPhotos.length === 0) return;
    const results: ProcessingResults = {
      totalImages: 50,
      totalFacesDetected: 45,
      recognizedStudents: studentsWithPhotos.map(s => s.name),
      averageConfidence: 0.92,
      sessionId: "abc123session",
    };
    setBatchResults(results);
    setShowModal(true);
  };

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          title="Model Training"
          subtitle="Manage face recognition model training"
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <StatsCards stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4">
              {trainingStatus?.isTraining && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Training in Progress</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${trainingStatus.progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 text-center">
                        {trainingStatus.progress}% complete
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>Face Recognition Model Training</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{studentsWithPhotos.length}</p>
                      <p className="text-sm text-gray-600">Students with Photos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{trainedStudents.length}</p>
                      <p className="text-sm text-gray-600">Trained</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{untrainedStudents.length}</p>
                      <p className="text-sm text-gray-600">Need Training</p>
                    </div>
                  </div>

                  {untrainedStudents.length > 0 ? (
                    <div className="space-y-4 text-center">
                      <Button
                        onClick={() => trainModelMutation.mutate()}
                        disabled={trainingStatus?.isTraining || trainModelMutation.isPending || studentsWithPhotos.length === 0}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
                      >
                        <Brain className="mr-2 h-5 w-5" />
                        {trainModelMutation.isPending
                          ? "Starting Training..."
                          : trainingStatus?.isTraining
                          ? "Training in Progress..."
                          : `Train Model (${untrainedStudents.length} students)`}
                      </Button>

                      <div className="text-sm text-gray-600">
                        Training typically takes 2-5 minutes depending on the number of students.
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleBatchProcessingComplete}
                        disabled={trainedStudents.length === 0}
                      >
                        Test Recognition (Demo)
                      </Button>
                    </div>
                  ) : studentsWithPhotos.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">No Student Photos Found</p>
                      <Button variant="outline" onClick={() => window.location.href = "/admin/students"}>
                        Go to Students
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">Model Training Complete!</p>
                      <Button variant="outline" onClick={handleBatchProcessingComplete}>
                        Test Recognition
                      </Button>
                    </div>
                  )}

                  {trainModelMutation.isError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm">
                        Training failed: {trainModelMutation.error?.message || "Unknown error"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Student Training Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {studentsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Loading students...</p>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No students found.</div>
                  ) : (
                    students.map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {student.isTrainingComplete ? (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : student.photos.length > 0 || student.datasetFolderExists ? (
                            <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{student.name}</p>
                            <p className="text-sm text-gray-600">ID: {student.studentId}</p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            student.isTrainingComplete
                              ? "default"
                              : student.photos.length > 0 || student.datasetFolderExists
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {student.isTrainingComplete
                            ? "Trained"
                            : student.photos.length > 0 || student.datasetFolderExists
                            ? "Needs Training"
                            : "No Photos"}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <BatchProcessingModal isOpen={showModal} onClose={() => setShowModal(false)} results={batchResults} />
    </div>
  );
}
