"use client";

import { useState } from "react";
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
};

export default function LiveAttendance() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);

  // Fetch classes for session creation
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      return res.json();
    },
    initialData: [],
  });

  const handleBatchComplete = async (images: string[]) => {
    try {
      // Create a new session - use first active class or null if none available
      const activeClass = classes.find(c => c.isActive) || classes[0];
      
      const sessionData = {
        classId: activeClass?.id || null
      };

      const sessionResponse = await apiRequest("POST", "/api/attendance-sessions", sessionData);
      const session = await sessionResponse.json();

      // Process the batch
      const response = await apiRequest("POST", "/api/face-recognition/process-batch", {
        sessionId: session.id,
        images
      });

      const results = await response.json();
      setBatchResults(results.results);
      setShowProcessingModal(true);
    } catch (error) {
      console.error("Batch processing failed:", error);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <Header 
          title="Live Attendance" 
          subtitle="Capture and process classroom attendance in real-time"
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Main Webcam Capture */}
            <div className="lg:col-span-3">
              <WebcamCapture onBatchComplete={handleBatchComplete} />
            </div>

            {/* Sidebar Info */}
            <div className="space-y-4 lg:space-y-6">
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

              {/* Active Class Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Current Session</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {classes.length > 0 ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Active Class:</span>
                        <span className="font-medium">
                          {classes.find(c => c.isActive)?.name || classes[0]?.name || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Class Code:</span>
                        <span className="font-medium">
                          {classes.find(c => c.isActive)?.code || classes[0]?.code || "—"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">No classes available</div>
                  )}
                </CardContent>
              </Card>

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
                    <span className="text-blue-600 font-medium">Up to date</span>
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

      <BatchProcessingModal
        isOpen={showProcessingModal}
        onClose={() => setShowProcessingModal(false)}
        results={batchResults}
      />
    </div>
  );
}