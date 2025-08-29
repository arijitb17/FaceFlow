// components/attendance/batch-processing-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X, 
  CheckCircle, 
  Users, 
  Camera, 
  Brain,
  Download,
  Eye
} from "lucide-react";

interface ProcessingResults {
  totalImages: number;
  totalFacesDetected: number;
  recognizedStudents: string[];
  averageConfidence: number;
  sessionId: string;
}

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ProcessingResults | null;
}

export default function BatchProcessingModal({ 
  isOpen, 
  onClose, 
  results 
}: BatchProcessingModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowDetails(false);
    }
  }, [isOpen]);

  if (!isOpen || !results) return null;

  const recognitionRate = results.totalFacesDetected > 0 
    ? (results.recognizedStudents.length / results.totalFacesDetected * 100).toFixed(1)
    : '0';

  const confidencePercentage = (results.averageConfidence * 100).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-semibold">Processing Complete</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Camera className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{results.totalImages}</p>
              <p className="text-sm text-gray-600">Images Processed</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Eye className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{results.totalFacesDetected}</p>
              <p className="text-sm text-gray-600">Faces Detected</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{results.recognizedStudents.length}</p>
              <p className="text-sm text-gray-600">Students Present</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Brain className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{confidencePercentage}%</p>
              <p className="text-sm text-gray-600">Avg Confidence</p>
            </div>
          </div>

          {/* Recognition Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recognition Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Recognition Rate:</span>
                  <Badge variant="default" className="bg-green-500">
                    {recognitionRate}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Average Confidence:</span>
                  <Badge variant={Number(confidencePercentage) > 70 ? "default" : "destructive"}>
                    {confidencePercentage}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Session ID:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {results.sessionId.substring(0, 8)}...
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recognized Students */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Recognized Students ({results.recognizedStudents.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.recognizedStudents.length > 0 ? (
                <div className="space-y-2">
                  {showDetails ? (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {results.recognizedStudents.map((studentId, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded border">
                          <span className="font-medium">{studentId}</span>
                          <Badge variant="default" className="bg-green-500">Present</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {results.recognizedStudents.slice(0, 10).map((studentId, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {studentId}
                        </Badge>
                      ))}
                      {results.recognizedStudents.length > 10 && (
                        <Badge variant="secondary" className="text-xs">
                          +{results.recognizedStudents.length - 10} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No students recognized in this session
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quality Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quality Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {Number(confidencePercentage) > 80 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : Number(confidencePercentage) > 60 ? (
                    <Eye className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-sm">
                    {Number(confidencePercentage) > 80 
                      ? "Excellent recognition quality"
                      : Number(confidencePercentage) > 60
                        ? "Good recognition quality"
                        : "Fair recognition quality - consider retraining"
                    }
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Higher confidence indicates better face matching</p>
                  <p>• Low confidence may indicate poor lighting or image quality</p>
                  <p>• Consider retraining if confidence is consistently below 60%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Download results as JSON
                  const dataStr = JSON.stringify(results, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `attendance-${results.sessionId.substring(0, 8)}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Results
              </Button>
              <Button onClick={onClose}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}