import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, User } from "lucide-react";
import type { Student } from "@shared/schema";

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    studentId: "",
    email: ""
  });
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery({
    queryKey: ["/api/students"],
  });

  const addStudentMutation = useMutation({
    mutationFn: async (student: typeof newStudent) => {
      const response = await apiRequest("POST", "/api/students", student);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setShowAddModal(false);
      setNewStudent({ name: "", studentId: "", email: "" });
      toast({
        title: "Success",
        description: "Student added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive",
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/students/${id}`);
      return response.status === 204 ? null : await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    },
  });

  const filteredStudents = students?.filter((student: Student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.studentId) {
      toast({
        title: "Error",
        description: "Name and Student ID are required",
        variant: "destructive",
      });
      return;
    }
    addStudentMutation.mutate(newStudent);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1">
          <Header title="Students" subtitle="Loading..." />
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Students" 
          subtitle="Manage student profiles and training data"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-students"
                />
              </div>
            </div>
            
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90" data-testid="button-add-student">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="modal-add-student">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      placeholder="Enter student's full name"
                      data-testid="input-student-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      value={newStudent.studentId}
                      onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                      placeholder="Enter student ID"
                      data-testid="input-student-id"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                      placeholder="Enter email address"
                      data-testid="input-student-email"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleAddStudent}
                      disabled={addStudentMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-student"
                    >
                      {addStudentMutation.isPending ? "Adding..." : "Add Student"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddModal(false)}
                      data-testid="button-cancel-add"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student: Student, index: number) => (
              <Card key={student.id} className="shadow-sm border border-gray-200" data-testid={`student-card-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="text-gray-600 h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg" data-testid={`student-name-${index}`}>
                          {student.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600" data-testid={`student-id-${index}`}>
                          ID: {student.studentId}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={student.isTrainingComplete ? "default" : "secondary"}
                      data-testid={`student-training-status-${index}`}
                    >
                      {student.isTrainingComplete ? "Trained" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span data-testid={`student-email-${index}`}>
                        {student.email || "Not provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Photos:</span>
                      <span data-testid={`student-photos-${index}`}>
                        {student.photos?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Enrolled:</span>
                      <span data-testid={`student-enrolled-${index}`}>
                        {new Date(student.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-edit-student-${index}`}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteStudentMutation.mutate(student.id)}
                      disabled={deleteStudentMutation.isPending}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-student-${index}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12" data-testid="no-students-message">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No students found" : "No students yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? "Try adjusting your search criteria"
                  : "Get started by adding your first student"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)} data-testid="button-add-first-student">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
