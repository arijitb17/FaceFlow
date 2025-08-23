import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import WebcamCapture from "@/components/attendance/webcam-capture";
import BatchProcessingModal from "@/components/attendance/batch-processing-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function LiveAttendance() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);

  const handleBatchComplete = async (images: string[]) => {
    try {
      // Create a new session
      const sessionResponse = await fetch("/api/attendance-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: "class-1" })
      });
      
      const session = await sessionResponse.json();

      // Process the batch
      const response = await fetch("/api/face-recognition/process-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          images
        })
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
      <div className="flex-1 overflow-hidden">
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Processing Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Recognition Model:</span>
                    <span className="text-secondary font-medium">Active</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Training Status:</span>
                    <span className="text-accent font-medium">Up to date</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Training:</span>
                    <span className="text-gray-600">2 days ago</span>
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
