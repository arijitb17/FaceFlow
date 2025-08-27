import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain, Upload, Play, CheckCircle, AlertCircle, User, Camera } from "lucide-react";
import type { Student } from "@shared/schema";

export default function Training() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Type the query explicitly
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students");
      return (await res.json()) as Student[];
    },
  });

  const trainModelMutation = useMutation<
    any,
    unknown,
    { [studentId: string]: string[] }
  >({
    mutationFn: async (studentPhotos) => {
      const res = await apiRequest("POST", "/api/face-recognition/train", { studentPhotos });
      return await res.json();
    },
    onSuccess: () => {
      setIsTraining(false);
      setTrainingProgress(100);
      toast({
        title: "Training Complete",
        description: "Face recognition model has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: () => {
      setIsTraining(false);
      setTrainingProgress(0);
      toast({
        title: "Training Failed",
        description: "Failed to train the face recognition model",
        variant: "destructive",
      });
    },
  });

  const handleStartTraining = () => {
    if (selectedStudents.size === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student for training",
        variant: "destructive",
      });
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);

    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    const studentPhotos: { [studentId: string]: string[] } = {};
    selectedStudents.forEach((id) => (studentPhotos[id] = []));
    trainModelMutation.mutate(studentPhotos);
  };

  const handleSelectAll = () => {
    if (!students) return;
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map((s) => s.id)));
    }
  };

  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const trainedStudents = students?.filter((s) => s.isTrainingComplete) || [];
  const pendingStudents = students?.filter((s) => !s.isTrainingComplete) || [];

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1">
          <Header title="Training" subtitle="Loading..." onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="p-4 lg:p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          title="Training"
          subtitle="Manage face recognition model training"
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Training Status Card */}
          <Card className="mb-6 shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>Training Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">{trainedStudents.length}</div>
                  <div className="text-sm text-gray-600">Students Trained</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">{pendingStudents.length}</div>
                  <div className="text-sm text-gray-600">Pending Training</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">96.2%</div>
                  <div className="text-sm text-gray-600">Model Accuracy</div>
                </div>
              </div>

              {isTraining && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Training Progress</span>
                    <span className="text-sm text-gray-500">{trainingProgress}%</span>
                  </div>
                  <Progress value={trainingProgress} className="w-full" />
                  <p className="text-sm text-gray-600 mt-2">
                    Training face recognition model... This may take a few minutes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training Controls */}
          <Card className="mb-6 shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle>Training Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="outline" onClick={handleSelectAll} disabled={isTraining}>
                    {selectedStudents.size === students?.length ? "Deselect All" : "Select All"}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {selectedStudents.size} of {students?.length || 0} students selected
                  </span>
                </div>
                <Button
                  onClick={handleStartTraining}
                  disabled={isTraining || selectedStudents.size === 0}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isTraining ? "Training..." : "Start Training"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Students Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Training */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-accent" />
                  <span>Pending Training ({pendingStudents.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingStudents.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => handleToggleStudent(student.id)}
                          disabled={isTraining}
                          className="rounded border-gray-300"
                        />
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="text-gray-600 h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">ID: {student.studentId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Camera className="h-4 w-4" />
                          <span>{student.photos?.length || 0} photos</span>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    </div>
                  ))}
                  {pendingStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p>No students pending training</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Trained Students */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-secondary" />
                  <span>Trained Students ({trainedStudents.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {trainedStudents.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="text-gray-600 h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">ID: {student.studentId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Camera className="h-4 w-4" />
                          <span>{student.photos?.length || 0} photos</span>
                        </div>
                        <Badge className="bg-secondary text-white">Trained</Badge>
                      </div>
                    </div>
                  ))}
                  {trainedStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p>No students have been trained yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
