"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/stats/stats-cards"; // Fixed import
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
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "teacher" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (!res.ok) throw new Error("Failed to fetch user");
        const user = await res.json();
        setUserName(user.name || "Guest");
        setUserRole(user.role || "teacher");
        setUserId(user.id || null);
      } catch (err) {
        console.error("Error fetching user:", err);
        setUserName("Guest");
        setUserRole("teacher");
        setUserId(null);
      }
    }
    fetchUser();
  }, []);

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

  // Fetch students - now filtered by teacher's classes
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["teacher-students", userRole],
    queryFn: async () => {
      // Use the endpoint that returns only teacher's students
      const endpoint = userRole === "admin" ? "/api/students" : "/api/students/my";
      const res = await apiRequest("GET", endpoint);
      const json = await parseJsonSafely(res);
      
      // Handle different response structures
      const studentsList = json.students || json || [];
      if (!Array.isArray(studentsList)) return [];

      return await Promise.all(
        studentsList.map(async (s: any) => {
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
    enabled: !!userRole, // Only fetch when we know the user role
  });

  // Fetch training status - now based on teacher's students only
  const { data: trainingStatus } = useQuery<TrainingStatus>({
    queryKey: ["training-status", students.length],
    queryFn: async () => {
      try {
        // Calculate training status based on teacher's students
        const studentsWithPhotos = students.filter(s => s.photos.length > 0 || s.datasetFolderExists);
        const trainedStudents = students.filter(s => s.isTrainingComplete);
        
        // Check if global training is in progress
        const res = await apiRequest("GET", "/api/face-recognition/training-status");
        const globalStatus = await parseJsonSafely(res);
        
        return {
          isTraining: globalStatus.isTraining || false,
          progress: globalStatus.progress || 0,
          message: globalStatus.message || "Ready to train",
          totalStudents: students.length,
          studentsWithPhotos: studentsWithPhotos.length,
          trainedStudents: trainedStudents.length,
          needsTraining: studentsWithPhotos.length > trainedStudents.length,
        };
      } catch {
        const studentsWithPhotos = students.filter(s => s.photos.length > 0 || s.datasetFolderExists);
        const trainedStudents = students.filter(s => s.isTrainingComplete);
        
        return {
          isTraining: false,
          progress: 0,
          message: "Ready to train",
          totalStudents: students.length,
          studentsWithPhotos: studentsWithPhotos.length,
          trainedStudents: trainedStudents.length,
          needsTraining: studentsWithPhotos.length > trainedStudents.length,
        };
      }
    },
    refetchInterval: 2000,
    enabled: students.length > 0, // Only fetch when students are loaded
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
      queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
      queryClient.invalidateQueries({ queryKey: ["training-status"] });
    },
    onError: (error: any) => {
      console.error("Training failed:", error?.message ?? error);
    },
  });

  const studentsWithPhotos = students.filter(s => s.photos.length > 0 || s.datasetFolderExists);
  const untrainedStudents = studentsWithPhotos.filter(s => !s.isTrainingComplete);
  const trainedStudents = students.filter(s => s.isTrainingComplete);

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

  // Show loading state until user role is determined
  if (!userRole) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          title="Model Training"
          subtitle={userRole === "admin" ? "Train all student data" : "Train your students' data"}
          onMenuClick={() => setIsSidebarOpen(true)}
          userName={userName ?? "Loading..."} 
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Updated to use proper StatsCards component */}
          <div className="mb-6">
            <StatsCards
              userRole={userRole}
              userId={userRole === "teacher" ? userId ?? undefined : undefined}
            />
          </div>

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
                      <p className="text-sm text-gray-600 mb-4">
                        {userRole === "admin" ? "No students have uploaded photos yet." : "None of your students have uploaded photos yet."}
                      </p>
                      <Button variant="outline" onClick={() => window.location.href = "/admin/students"}>
                        Go to Students
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">Model Training Complete!</p>
                      <p className="text-sm text-gray-600 mb-4">
                        {userRole === "admin" ? "All students are trained." : "All your students are trained and ready for recognition."}
                      </p>
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

            {/* Right Column - Now shows only teacher's students */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {userRole === "admin" ? "All Students Training Status" : "Your Students Training Status"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {studentsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Loading students...</p>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {userRole === "admin" ? "No students found." : "No students enrolled in your classes."}
                    </div>
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