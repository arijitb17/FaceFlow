import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, UserPlus, Users, Trash2, RefreshCw } from "lucide-react";
import Sidebar from "@/components/admin/sidebar";

// ---------- Types ----------
interface Class {
  id: string;
  name: string;
  code: string;
  teacher?: {
    id: string;
    user: {
      name: string;
    };
  };
}

interface Student {
  id: string;
  userId?: string;
  studentId: string;
  rollNo: string;
  name: string;
  email?: string;
  yearLevel: number;
  program: string;
  photos?: string[];
  embedding?: number[];
  isTrainingComplete?: boolean;
  createdAt?: string;
}

interface ClassEnrollment {
  id: string;
  classId: string;
  studentId: string;
  enrolledAt: string;
}

// Helper function for API requests
const apiRequest = async (method: string, url: string, body?: any) => {
  const token = localStorage.getItem("authToken");
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  };
  
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response;
};

// ---------- Component ----------
export default function AdminStudents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");

  // Fetch classes
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      return res.json();
    },
  });

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students");
      return res.json();
    },
  });

  // Fetch class students (using the correct endpoint from routes)
  const { data: classStudents = [] } = useQuery<Student[]>({
    queryKey: ["/api/classes", selectedClass, "students"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/classes/${selectedClass}/students`);
      return res.json();
    },
    enabled: !!selectedClass,
  });

  // Mutation: enroll student (using the correct endpoint)
  const enrollStudentMutation = useMutation({
    mutationFn: async (data: { studentId: string; classId: string }) => {
      const response = await apiRequest("POST", `/api/classes/${data.classId}/students/${data.studentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", selectedClass, "students"] });
      toast({ title: "Student enrolled successfully" });
      setIsEnrollDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll student",
        variant: "destructive",
      });
    },
  });

  // Mutation: unenroll student (Note: this endpoint doesn't exist in your routes)
  const unenrollStudentMutation = useMutation({
    mutationFn: async (data: { studentId: string; classId: string }) => {
      // This endpoint doesn't exist in your routes.ts - you need to implement it
      throw new Error("Unenroll endpoint not implemented in backend");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", selectedClass, "students"] });
      toast({ title: "Student unenrolled successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unenroll student",
        variant: "destructive",
      });
    },
  });

  // Handle enroll form
  const handleEnroll = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentId = formData.get("studentId") as string;

    if (studentId && selectedClass) {
      enrollStudentMutation.mutate({ studentId, classId: selectedClass });
    }
  };

  // Data helpers
  const selectedClassData = classes.find((c) => c.id === selectedClass);
  const enrolledStudentIds = classStudents.map((s) => s.id);
  const availableStudents = students.filter((s) => !enrolledStudentIds.includes(s.id));

  // ---------- UI ----------
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-6 h-6 text-slate-600" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900" data-testid="text-page-title">
                Student Enrollment
              </h1>
              <p className="text-slate-600">Manage student enrollments in classes</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Class Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Class</CardTitle>
              </CardHeader>
              <CardContent>
                {classesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger data-testid="select-class">
                      <SelectValue placeholder="Choose a class to manage enrollments" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name} ({classItem.code})
                          {classItem.teacher && ` - ${classItem.teacher.user.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Enrollment Management */}
            {selectedClass && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle data-testid="text-selected-class">
                        {selectedClassData?.name} Enrollments
                      </CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        Manage students enrolled in this class
                      </p>
                    </div>
                    <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-enroll-student">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Enroll Student
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enroll Student</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEnroll} className="space-y-4">
                          <div>
                            <Label htmlFor="studentId">Select Student</Label>
                            {studentsLoading ? (
                              <div className="flex items-center justify-center py-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                              </div>
                            ) : (
                              <Select name="studentId" required>
                                <SelectTrigger data-testid="select-student">
                                  <SelectValue placeholder="Choose student to enroll" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableStudents.map((student) => (
                                    <SelectItem key={student.id} value={student.id}>
                                      {student.name} ({student.studentId})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={enrollStudentMutation.isPending || availableStudents.length === 0}
                            data-testid="button-confirm-enroll"
                          >
                            {enrollStudentMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <UserPlus className="w-4 h-4 mr-2" />
                            )}
                            {availableStudents.length === 0 ? "No Students Available" : "Enroll Student"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {classStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No students enrolled</h3>
                      <p className="text-slate-500 mb-4">Start by enrolling students in this class</p>
                      <Button onClick={() => setIsEnrollDialogOpen(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Enroll First Student
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {classStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                              <GraduationCap className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <h4
                                className="font-medium text-slate-900"
                                data-testid={`text-student-name-${student.id}`}
                              >
                                {student.name}
                              </h4>
                              <p className="text-sm text-slate-500">
                                Student ID: {student.studentId} | Roll No: {student.rollNo}
                              </p>
                              {student.email && (
                                <p className="text-xs text-slate-400">{student.email}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant="default">Enrolled</Badge>
                            <p className="text-xs text-slate-500">
                              Program: {student.program} | Year: {student.yearLevel}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unenrollStudentMutation.mutate({ studentId: student.id, classId: selectedClass })}
                              disabled // Disabled until backend implements unenroll endpoint
                              data-testid={`button-unenroll-${student.id}`}
                              title="Unenroll endpoint not implemented"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedClass && (
              <Card>
                <CardContent className="text-center py-12">
                  <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Select a class</h3>
                  <p className="text-slate-500">Choose a class from the dropdown above to manage student enrollments</p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}