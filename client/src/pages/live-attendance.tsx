"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import WebcamCapture from "@/components/attendance/webcam-capture";
import BatchProcessingModal from "@/components/attendance/batch-processing-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Class = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  teacherId: string;
};

type ProcessingResults = {
  totalImages: number;
  totalFacesDetected: number;
  recognizedStudents: string[];
  averageConfidence: number;
  sessionId: string;
};

type TrainingStatus = {
  isTraining: boolean;
  progress: number;
  message: string;
};

export default function LiveAttendance() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [batchResults, setBatchResults] = useState<ProcessingResults | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    isTraining: false,
    progress: 0,
    message: "Ready",
  });
  
  // Selected class for attendance
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [userName, setUserName] = useState("Guest");
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (!res.ok) throw new Error("Failed to fetch user");
        const user = await res.json();
        setUserName(user.name || "Guest");
      } catch (err) {
        console.error(err);
        setUserName("Guest");
      }
    }
    fetchUser();
  }, []);
  // Fetch classes assigned to the logged-in teacher
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes"); // Backend should filter by logged-in teacher
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set default selected class when classes load
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  // Fetch training status periodically
  const { data: trainingData } = useQuery<TrainingStatus, Error>({
    queryKey: ["training-status"],
    queryFn: async (): Promise<TrainingStatus> => {
      const res = await apiRequest("GET", "/api/face-recognition/training-status");
      if (!res.ok) throw new Error("Failed to fetch training status");
      return res.json() as Promise<TrainingStatus>;
    },
    refetchInterval: 5000,
  });

  // Update local state whenever trainingData changes
  useEffect(() => {
    if (trainingData) {
      setTrainingStatus(trainingData);
    }
  }, [trainingData]);

  const handleBatchComplete = async (images: string[]) => {
    try {
      if (!images.length) return;
      if (!selectedClass) {
        alert("Please select a class to record attendance.");
        return;
      }

      // Create new attendance session for the selected class
      const sessionResponse = await apiRequest("POST", "/api/attendance-sessions", {
        classId: selectedClass.id,
      });
      if (!sessionResponse.ok) throw new Error("Failed to create attendance session");
      const session = await sessionResponse.json();

      // Process the batch
      const response = await apiRequest("POST", "/api/face-recognition/process-batch", {
        sessionId: session.id,
        images,
      });
      if (!response.ok) throw new Error("Batch processing failed");
      const data = await response.json();

      const processingResults: ProcessingResults = {
        totalImages: data.results.totalImages,
        totalFacesDetected: data.results.totalFacesDetected,
        recognizedStudents: data.results.recognizedStudents,
        averageConfidence: data.results.averageConfidence,
        sessionId: data.results.sessionId,
      };

      setBatchResults(processingResults);
      setShowProcessingModal(true);
    } catch (error) {
      console.error("Batch processing failed:", error);
      alert((error as Error).message);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0">
       <Header
                 title="Dashboard"
                 subtitle="Monitor attendance and manage your classes"
                 showStartAttendance
                 onStartAttendance={() => {}}
                 onMenuClick={() => setIsSidebarOpen(true)}
                 userName={userName}
               />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Main Webcam Capture */}
            <div className="lg:col-span-3">
              <WebcamCapture
                onBatchComplete={handleBatchComplete}
                disabled={!selectedClass} // Disable capture if no class selected
              />
            </div>

            {/* Sidebar Info */}
            <div className="space-y-4 lg:space-y-6">
              {/* Capture Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Capture Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Optimal Setup:</h4>
                    <ul className="space-y-1 text-xs">
                      <li>• Position camera at eye level</li>
                      <li>• Ensure good lighting</li>
                      <li>• Keep students facing camera</li>
                      <li>• Maintain 3-6 feet distance</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Best Practices:</h4>
                    <ul className="space-y-1 text-xs">
                      <li>• Start capture before class begins</li>
                      <li>• Use 2-3 second intervals</li>
                      <li>• Capture 15-20 images minimum</li>
                      <li>• Review results before saving</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Select Class */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Current Session</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {classes.length > 0 ? (
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={selectedClass?.id || ""}
                      onChange={(e) => {
                        const cls = classes.find((c) => c.id === e.target.value) || null;
                        setSelectedClass(cls);
                      }}
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-gray-500">No classes assigned</div>
                  )}

                  {selectedClass && (
                    <div className="mt-2 text-sm">
                      <div>
                        <span className="font-medium">Class Name: </span>{selectedClass.name}
                      </div>
                      <div>
                        <span className="font-medium">Class Code: </span>{selectedClass.code}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Training & System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Processing Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Recognition Model:</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Training Status:</span>
                    <span
                      className={`font-medium ${
                        trainingStatus.isTraining ? "text-orange-600" : "text-blue-600"
                      }`}
                    >
                      {trainingStatus.isTraining
                        ? `${trainingStatus.message} (${trainingStatus.progress}%)`
                        : "Up to date"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>System Status:</span>
                    <span className="text-green-600 font-medium">Ready</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Batch Processing Modal */}
      <BatchProcessingModal
        isOpen={showProcessingModal}
        onClose={() => setShowProcessingModal(false)}
        results={batchResults}
      />
    </div>
  );
}
