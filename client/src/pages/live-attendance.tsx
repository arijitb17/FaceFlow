"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import WebcamCapture from "@/components/attendance/webcam-capture";
import BatchProcessingModal from "@/components/attendance/batch-processing-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Users, CheckCircle, AlertTriangle, Clock, Lightbulb, Target } from "lucide-react";

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
  
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [userName, setUserName] = useState("Guest");
  const [showTips, setShowTips] = useState(true);

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
      const res = await apiRequest("GET", "/api/classes");
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
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

      const sessionResponse = await apiRequest("POST", "/api/attendance-sessions", {
        classId: selectedClass.id,
      });
      if (!sessionResponse.ok) throw new Error("Failed to create attendance session");
      const session = await sessionResponse.json();

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
          title="Live Attendance"
          subtitle="Capture attendance using facial recognition"
          onStartAttendance={() => {}}
          onMenuClick={() => setIsSidebarOpen(true)}
          userName={userName}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {/* Mobile Layout */}
          <div className="block lg:hidden space-y-4">
            {/* Class Selection - Mobile */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Select Class</CardTitle>
              </CardHeader>
              <CardContent>
                {classes.length > 0 ? (
                  <Select
                    value={selectedClass?.id || ""}
                    onValueChange={(value) => {
                      const cls = classes.find((c) => c.id === value) || null;
                      setSelectedClass(cls);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-gray-500">({c.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No classes assigned
                  </div>
                )}

                {selectedClass && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 text-sm mb-1">Current Session</h4>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Class:</span> {selectedClass.name}</div>
                      <div><span className="font-medium">Code:</span> {selectedClass.code}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Card - Mobile */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Recognition Model:</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Training Status:</span>
                    <Badge 
                      variant={trainingStatus.isTraining ? "secondary" : "default"}
                      className={trainingStatus.isTraining ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}
                    >
                      {trainingStatus.isTraining
                        ? `${trainingStatus.progress}%`
                        : "Ready"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">System Status:</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips - Mobile (Collapsible) */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Lightbulb className="mr-2 h-5 w-5" />
                    Capture Tips
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowTips(!showTips)}
                    className="text-xs"
                  >
                    {showTips ? "Hide" : "Show"}
                  </Button>
                </div>
              </CardHeader>
              {showTips && (
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <Target className="h-4 w-4 text-blue-600 mr-2" />
                      <h4 className="font-medium text-gray-900 text-sm">Optimal Setup</h4>
                    </div>
                    <ul className="space-y-1 text-xs text-gray-600 ml-6">
                      <li>• Position camera at eye level</li>
                      <li>• Ensure good lighting</li>
                      <li>• Keep students facing camera</li>
                      <li>• Maintain 3-6 feet distance</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <h4 className="font-medium text-gray-900 text-sm">Best Practices</h4>
                    </div>
                    <ul className="space-y-1 text-xs text-gray-600 ml-6">
                      <li>• Start capture before class begins</li>
                      <li>• Use 2-3 second intervals</li>
                      <li>• Capture 15-20 images minimum</li>
                      <li>• Review results before saving</li>
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Webcam - Mobile */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  Camera Capture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WebcamCapture
                  onBatchComplete={handleBatchComplete}
                  disabled={!selectedClass}
                />
                {!selectedClass && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-800">
                        Please select a class before starting capture
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Main Webcam Capture */}
            <div className="lg:col-span-3">
              <WebcamCapture
                onBatchComplete={handleBatchComplete}
                disabled={!selectedClass}
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
                    <Select
                      value={selectedClass?.id || ""}
                      onValueChange={(value) => {
                        const cls = classes.find((c) => c.id === value) || null;
                        setSelectedClass(cls);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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