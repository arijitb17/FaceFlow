"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Camera, 
  Brain, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  AlertTriangle,
  Play
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  studentId: string;
  photos: string[];
  isTrainingComplete: boolean;
}

interface TrainingStatus {
  isTraining: boolean;
  progress: number;
  totalStudents: number;
  studentsWithPhotos: number;
  trainedStudents: number;
  needsTraining: boolean;
}

export default function ModelTraining() {
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Fetch students
// Fetch students
const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
  queryKey: ["students"],
  queryFn: async () => {
    const res = await apiRequest("GET", "/api/students");
    const json = await res.json(); // parse Response -> JSON
    return json.students || [];
  },
  refetchInterval: 5000,
});

// Fetch training status
const { data: trainingStatus } = useQuery<TrainingStatus>({
  queryKey: ["training-status"],
  queryFn: async () => {
    const res = await apiRequest("GET", "/api/face-recognition/training-status");
    const json = await res.json();
    return {
      isTraining: json.isTraining ?? false,
      progress: json.progress ?? 0,
      totalStudents: json.totalStudents ?? 0,
      studentsWithPhotos: json.studentsWithPhotos ?? 0,
      trainedStudents: json.trainedStudents ?? 0,
      needsTraining: json.needsTraining ?? false,
    } as TrainingStatus;
  },
  refetchInterval: 2000,
});


  // Train all students mutation
  const trainAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/face-recognition/train-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["training-status"] });
    }
  });

  // Train selected students mutation
  const trainSelectedMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      return apiRequest("POST", "/api/face-recognition/train-students", {
        studentIds
      });
    },
    onSuccess: () => {
      setSelectedStudents([]);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["training-status"] });
    }
  });

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const untrained = students
      .filter(s => s.photos.length > 0 && !s.isTrainingComplete)
      .map(s => s.id);
    setSelectedStudents(untrained);
  };

  const studentsWithPhotos = students.filter(s => s.photos.length > 0);
  const trainedStudents = students.filter(s => s.isTrainingComplete);
  const untrainedStudents = students.filter(s => s.photos.length > 0 && !s.isTrainingComplete);

  return (
    <div className="space-y-6">
      {/* Training Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500"/>
            <div>
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-sm text-gray-600">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-2">
            <Camera className="h-5 w-5 text-green-500"/>
            <div>
              <p className="text-2xl font-bold">{studentsWithPhotos.length}</p>
              <p className="text-sm text-gray-600">With Photos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500"/>
            <div>
              <p className="text-2xl font-bold">{trainedStudents.length}</p>
              <p className="text-sm text-gray-600">Model Trained</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500"/>
            <div>
              <p className="text-2xl font-bold">{untrainedStudents.length}</p>
              <p className="text-sm text-gray-600">Need Training</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Progress */}
      {trainingStatus?.isTraining && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Training in Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={trainingStatus.progress} className="w-full" />
            <p className="text-sm text-gray-600 mt-2">
              {trainingStatus.progress}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Training Actions */}
      <Card>
        <CardHeader><CardTitle>Model Training</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {untrainedStudents.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => trainAllMutation.mutate()}
                  disabled={trainingStatus?.isTraining || trainAllMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Brain className="mr-2 h-4 w-4" />
                  Train All ({untrainedStudents.length})
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSelectAll} 
                  disabled={trainingStatus?.isTraining}
                >
                  Select All Untrained
                </Button>
                {selectedStudents.length > 0 && (
                  <Button 
                    onClick={() => trainSelectedMutation.mutate(selectedStudents)}
                    disabled={trainingStatus?.isTraining || trainSelectedMutation.isPending}
                    variant="secondary"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Train Selected ({selectedStudents.length})
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Students with photos that need training will be processed. This may take several minutes.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-medium">All students are trained!</p>
              <p className="text-sm text-gray-600">Face recognition model is ready.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader><CardTitle>Student Training Status</CardTitle></CardHeader>
        <CardContent>
          {studentsLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No students found.</div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedStudents.includes(student.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleSelectStudent(student.id)}
                >
                  <div className="flex items-center space-x-3">
                    {student.isTrainingComplete 
                      ? <CheckCircle className="h-6 w-6 text-green-500" />
                      : student.photos.length > 0 
                        ? <AlertTriangle className="h-6 w-6 text-orange-500" />
                        : <XCircle className="h-6 w-6 text-red-500" />
                    }
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-600">ID: {student.studentId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <p className="text-sm text-gray-600">
                      {student.photos.length} photo{student.photos.length !== 1 ? "s" : ""}
                    </p>
                    <Badge variant={
                      student.isTrainingComplete ? "default"
                      : student.photos.length > 0 ? "destructive"
                      : "secondary"
                    }>
                      {student.isTrainingComplete ? "Trained"
                        : student.photos.length > 0 ? "Needs Training"
                        : "No Photos"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
