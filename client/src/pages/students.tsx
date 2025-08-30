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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    studentId: "",
    email: ""
  });
  const { toast } = useToast();

  const { data: session } = useSession(); // get logged-in teacher info
  const teacherId = session?.user?.id;

  // Fetch students under logged-in teacher
  const { data: studentsData, isLoading } = useQuery<Student[]>({
    queryKey: ["/api/students", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const res = await apiRequest("GET", `/api/students?teacherId=${teacherId}`);
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled: !!teacherId, // only run if teacherId exists
  });

  const students = studentsData || [];

  const addStudentMutation = useMutation({
    mutationFn: async (student: typeof newStudent) => {
      const response = await apiRequest("POST", `/api/students`, { ...student, teacherId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students", teacherId] });
      setShowAddModal(false);
      setNewStudent({ name: "", studentId: "", email: "" });
      toast({ title: "Success", description: "Student added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add student", variant: "destructive" });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/students/${id}`);
      return response.status === 204 ? null : await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students", teacherId] });
      toast({ title: "Success", description: "Student deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete student", variant: "destructive" });
    },
  });

  const filteredStudents = students.filter((student) =>
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.studentId) {
      toast({ title: "Error", description: "Name and Student ID are required", variant: "destructive" });
      return;
    }
    addStudentMutation.mutate(newStudent);
  };

  if (isLoading) {
    return <div className="flex h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header title="Students" subtitle="Manage student profiles and training data" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header: Search & Add */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Full Name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} />
                  <Input placeholder="Student ID" value={newStudent.studentId} onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })} />
                  <Input placeholder="Email (optional)" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} />
                  <div className="flex space-x-3">
                    <Button onClick={handleAddStudent} disabled={addStudentMutation.isLoading} className="flex-1">
                      {addStudentMutation.isLoading ? "Adding..." : "Add Student"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Students Grid */}
          {filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {filteredStudents.map((student, idx) => (
                <Card key={student.id}>
                  <CardHeader className="pb-3 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="text-gray-600 h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle>{student.name}</CardTitle>
                        <p className="text-sm text-gray-600">ID: {student.studentId}</p>
                      </div>
                    </div>
                    <Badge variant={student.isTrainingComplete ? "default" : "secondary"}>
                      {student.isTrainingComplete ? "Trained" : "Pending"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Email:</span> <span>{student.email || "Not provided"}</span></div>
                    <div className="flex justify-between"><span>Photos:</span> <span>{student.photos?.length || 0}</span></div>
                    <div className="flex justify-between"><span>Enrolled:</span> <span>{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "N/A"}</span></div>
                  </CardContent>
                  <div className="flex space-x-2 mt-2 px-4 pb-4">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      <Edit className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive px-2" onClick={() => deleteStudentMutation.mutate(student.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{searchQuery ? "No students found" : "No students yet"}</h3>
              <p className="text-gray-600 mb-4">{searchQuery ? "Try adjusting your search criteria" : "Get started by adding your first student"}</p>
              {!searchQuery && <Button onClick={() => setShowAddModal(true)}><Plus className="mr-2 h-4 w-4" /> Add Student</Button>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
