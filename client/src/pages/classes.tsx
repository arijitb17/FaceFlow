"use client";

import { useState,useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, GraduationCap, Users, Clock } from "lucide-react";

type Teacher = {
  id: string;
  userId: string;
  department?: string;
  employeeId?: string;
  user: {
    name: string;
    email?: string;
  };
};

type Class = {
  id: string;
  name: string;
  code: string;
  description?: string;
  teacherId?: string;
  schedule?: string;
  isActive: boolean;
  createdAt: string;
  teacher?: Teacher;
};

export default function Classes() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState({
    name: "",
    code: "",
    description: "",
    schedule: "",
    teacherId: ""
  });
  const { toast } = useToast();
const [userName, setUserName] = useState<string | null>(null);

useEffect(() => {
  async function fetchUser() {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      const user = await res.json();
      setUserName(user.name || "Guest");
    } catch (err) {
      console.error("Error fetching user:", err);
      setUserName("Guest"); // only fallback if request fails
    }
  }
  fetchUser();
}, []);


  // Fetch classes
  const { data: classes = [], isLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      return res.json();
    }
  });

  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/teachers");
      return res.json();
    }
  });

  const addClassMutation = useMutation({
    mutationFn: async (classData: typeof newClass) => {
      const response = await apiRequest("POST", "/api/classes", classData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setShowAddModal(false);
      setNewClass({ name: "", code: "", description: "", schedule: "", teacherId: "" });
      toast({
        title: "Success",
        description: "Class created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create class",
        variant: "destructive",
      });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<typeof newClass>) => {
      const response = await apiRequest("PUT", `/api/classes/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setEditingClass(null);
      toast({
        title: "Success",
        description: "Class updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update class",
        variant: "destructive",
      });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      const response = await apiRequest("DELETE", `/api/classes/${classId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive",
      });
    },
  });

  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClass = () => {
    if (!newClass.name || !newClass.code || !newClass.teacherId) {
      toast({
        title: "Error",
        description: "Class name, code, and teacher are required",
        variant: "destructive",
      });
      return;
    }
    addClassMutation.mutate(newClass);
  };

  const handleEditClass = (cls: Class) => {
    setEditingClass(cls);
    setNewClass({
      name: cls.name,
      code: cls.code,
      description: cls.description || "",
      schedule: cls.schedule || "",
      teacherId: cls.teacherId || ""
    });
  };

  const handleUpdateClass = () => {
    if (!editingClass || !newClass.name || !newClass.code || !newClass.teacherId) {
      toast({
        title: "Error",
        description: "Class name, code, and teacher are required",
        variant: "destructive",
      });
      return;
    }
    updateClassMutation.mutate({ id: editingClass.id, ...newClass });
  };

  const handleDeleteClass = (classId: string) => {
    if (confirm("Are you sure you want to delete this class? This action cannot be undone.")) {
      deleteClassMutation.mutate(classId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1">
          <Header
  title="Classes"
  subtitle="Manage your classes and enrollment"
  onMenuClick={() => setIsSidebarOpen(true)}
  userName={userName ?? "Loading..."} // <- show Loading until API resolves
/>

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
  title="Classes"
  subtitle="Manage your classes and enrollment"
  onMenuClick={() => setIsSidebarOpen(true)}
  userName={userName ?? "Loading..."} 
/>


        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Search + Add button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Dialog open={showAddModal || !!editingClass} onOpenChange={(open) => {
              if (!open) {
                setShowAddModal(false);
                setEditingClass(null);
                setNewClass({ name: "", code: "", description: "", schedule: "", teacherId: "" });
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClass ? "Edit Class" : "Create New Class"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Class Name</Label>
                    <Input
                      id="name"
                      value={newClass.name}
                      onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                      placeholder="e.g., Introduction to Computer Science"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Class Code</Label>
                    <Input
                      id="code"
                      value={newClass.code}
                      onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                      placeholder="e.g., CS101"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacher">Teacher</Label>
                    <Select value={newClass.teacherId} onValueChange={(value) => setNewClass({ ...newClass, teacherId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.user.name} ({teacher.employeeId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="schedule">Schedule</Label>
                    <Input
                      id="schedule"
                      value={newClass.schedule}
                      onChange={(e) => setNewClass({ ...newClass, schedule: e.target.value })}
                      placeholder="e.g., MWF 9:00-10:30 AM"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newClass.description}
                      onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                      placeholder="Enter class description"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      onClick={editingClass ? handleUpdateClass : handleAddClass}
                      disabled={addClassMutation.isPending || updateClassMutation.isPending}
                      className="flex-1"
                    >
                      {addClassMutation.isPending || updateClassMutation.isPending 
                        ? (editingClass ? "Updating..." : "Creating...") 
                        : (editingClass ? "Update Class" : "Create Class")
                      }
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingClass(null);
                        setNewClass({ name: "", code: "", description: "", schedule: "", teacherId: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Classes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {filteredClasses.map((cls) => (
              <Card key={cls.id} className="shadow-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <GraduationCap className="text-primary h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <p className="text-sm text-gray-600">{cls.code}</p>
                      </div>
                    </div>
                    <Badge variant={cls.isActive ? "default" : "secondary"}>
                      {cls.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {cls.description && (
                    <p className="text-sm text-gray-600 mb-3">{cls.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    {cls.teacher && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{cls.teacher.user.name}</span>
                      </div>
                    )}
                    {cls.schedule && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{cls.schedule}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>
                        {cls.createdAt ? new Date(cls.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="px-2"
                      onClick={() => handleEditClass(cls)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive px-2"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClasses.length === 0 && (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No classes found" : "No classes yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "Get started by creating your first class"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Class
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}