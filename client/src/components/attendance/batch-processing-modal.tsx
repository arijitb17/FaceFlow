import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Download, Edit, X } from "lucide-react";

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  results?: {
    totalImages: number;
    totalFacesDetected: number;
    recognizedStudents: string[];
    averageConfidence: number;
  };
}

export default function BatchProcessingModal({
  isOpen,
  onClose,
  results
}: BatchProcessingModalProps) {
  if (!results) return null;

  const handleSaveAttendance = () => {
    // TODO: Implement save attendance logic
    console.log("Saving attendance...");
    onClose();
  };

  const handleExportReport = () => {
    // TODO: Implement export logic
    console.log("Exporting report...");
  };

  const handleManualCorrection = () => {
    // TODO: Implement manual correction logic
    console.log("Opening manual correction...");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" data-testid="batch-processing-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Batch Processing Results
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Processing Summary */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3" data-testid="summary-title">
                  Processing Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Images Captured:</span>
                    <span className="font-medium" data-testid="summary-images-captured">
                      {results.totalImages}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Faces Detected:</span>
                    <span className="font-medium" data-testid="summary-faces-detected">
                      {results.totalFacesDetected}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Students Recognized:</span>
                    <span className="font-medium" data-testid="summary-students-recognized">
                      {results.recognizedStudents.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Confidence:</span>
                    <span className="font-medium" data-testid="summary-avg-confidence">
                      {(results.averageConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student List */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3" data-testid="students-title">
                  Recognized Students
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {results.recognizedStudents.length > 0 ? (
                    results.recognizedStudents.map((student, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0"
                        data-testid={`recognized-student-${index}`}
                      >
                        <span className="text-gray-900">{student}</span>
                        <span className="text-sm bg-secondary/10 text-secondary px-2 py-1 rounded">
                          Present
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4" data-testid="no-students-message">
                      No students recognized
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={handleSaveAttendance}
              className="flex-1 bg-primary text-white hover:bg-primary/90"
              data-testid="button-save-attendance"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Attendance
            </Button>
            <Button
              onClick={handleExportReport}
              className="flex-1 bg-secondary text-white hover:bg-secondary/90"
              data-testid="button-export-report"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button
              onClick={handleManualCorrection}
              variant="outline"
              className="px-6"
              data-testid="button-manual-correction"
            >
              <Edit className="mr-2 h-4 w-4" />
              Manual Correction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
