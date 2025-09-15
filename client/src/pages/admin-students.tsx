// ===== ADMIN STUDENTS - Mobile Fixed =====
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, UserPlus, Users, Trash2, RefreshCw, Menu } from "lucide-react";
import Sidebar from "@/components/admin/sidebar";

interface Class {
  id: string;
  name: string;
  code: string;
  teacher?: {
    id: string;
    user: { name: string };
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

const apiRequest = async (method: string, url: string, body?: any) => {
  const token = localStorage.getItem("authToken");
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body && { body: JSON.stringify(body) }),
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response;
};

export default function AdminStudents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");

  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students");
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.students)) return data.students;
      return [];
    },
  });

  const { data: classStudents = [] } = useQuery<Student[]>({
    queryKey: ["/api/classes", selectedClass, "students"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/classes/${selectedClass}/students`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.students)) return data.students;
      return [];
    },
    enabled: !!selectedClass,
  });

  const enrollStudentMutation = useMutation({
    mutationFn: async (data: { studentId: string; classId: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/classes/${data.classId}/enroll`,
        { studentId: data.studentId }
      );
      const resData = await response.json();
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", selectedClass, "students"] });
      toast({ title: "Student enrolled successfully" });
      setIsEnrollDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to enroll student", variant: "destructive" });
    },
  });

  const unenrollStudentMutation = useMutation({
    mutationFn: async (data: { studentId: string; classId: string }) => {
      throw new Error("Unenroll endpoint not implemented in backend");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/classes", selectedClass, "students"] }),
    onError: (error: Error) => toast({ title: "Error", description: error.message || "Failed to unenroll student", variant: "destructive" }),
  });

  const handleEnroll = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentId = formData.get("studentId") as string;
    if (studentId && selectedClass) enrollStudentMutation.mutate({ studentId, classId: selectedClass });
  };

  const availableStudentsWithLabel = students.map(student => {
    const isEnrolled = classStudents.some(s => s.id === student.id);
    return { ...student, label: isEnrolled ? `${student.name} (Already Enrolled)` : student.name };
  });

  const selectedClassData = classes.find(c => c.id === selectedClass);

  return (
    <div className="flex h-screen bg-slate-50">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white shadow-sm border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate" data-testid="text-page-title">
                Student Enrollment
              </h1>
              <p className="text-xs sm:text-base text-slate-600 hidden sm:block">Manage student enrollments in classes</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {/* Class Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Select Class</CardTitle>
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
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex flex-col">
                            <span>{c.name} ({c.code})</span>
                            {c.teacher && <span className="text-xs text-slate-500">- {c.teacher.user.name}</span>}
                          </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle data-testid="text-selected-class" className="text-base sm:text-lg truncate">
                        {selectedClassData?.name} Enrollments
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        Manage students enrolled in this class
                      </p>
                    </div>

                    <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-enroll-student" className="w-full sm:w-auto whitespace-nowrap">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Enroll Student
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
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
                                  {availableStudentsWithLabel.map(student => (
                                    <SelectItem key={student.id} value={student.id}>
                                      <div className="flex flex-col">
                                        <span className="truncate">{student.label}</span>
                                        <span className="text-xs text-slate-500">ID: {student.studentId}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={enrollStudentMutation.isPending || students.length === 0}
                            data-testid="button-confirm-enroll"
                          >
                            {enrollStudentMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <UserPlus className="w-4 h-4 mr-2" />
                            )}
                            {students.length === 0 ? "No Students Available" : "Enroll Student"}
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
                      <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No students enrolled</h3>
                      <p className="text-slate-500 mb-4 text-sm sm:text-base">Start by enrolling students in this class</p>
                      <Button onClick={() => setIsEnrollDialogOpen(true)} className="w-full sm:w-auto">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Enroll First Student
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {classStudents.map(student => (
                        <div
                          key={student.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 rounded-lg space-y-3 sm:space-y-0 gap-4"
                        >
                          <div className="flex items-start sm:items-center space-x-4 min-w-0">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <GraduationCap className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-slate-900 truncate" data-testid={`text-student-name-${student.id}`}>
                                {student.name}
                              </h4>
                              <div className="text-sm text-slate-500 space-y-1">
                                <div className="break-words">Student ID: {student.studentId} | Roll: {student.rollNo}</div>
                                <div className="break-words">Program: {student.program} | Year: {student.yearLevel}</div>
                                {student.email && <div className="text-xs text-slate-400 break-words">{student.email}</div>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0">
                            <Badge variant="default" className="text-xs">Enrolled</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unenrollStudentMutation.mutate({ studentId: student.id, classId: selectedClass })}
                              disabled
                              data-testid={`button-unenroll-${student.id}`}
                              title="Unenroll endpoint not implemented"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                            >
                              <Trash2 className="w-4 h-4" />
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
                  <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">Select a class</h3>
                  <p className="text-slate-500 text-sm sm:text-base">Choose a class from the dropdown above to manage student enrollments</p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}