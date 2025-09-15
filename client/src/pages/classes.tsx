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
import { Plus, Search, Edit, Trash2, GraduationCap, Users, Clock, MoreVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
        setUserName("Guest");
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
            userName={userName ?? "Loading..."}
          />
          <div className="p-3 sm:p-4 lg:p-6">
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

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {/* Search + Add button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
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
                  <span className="hidden sm:inline">Add Class</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-4 sm:mx-0 max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingClass ? "Edit Class" : "Create New Class"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">Class Name</Label>
                    <Input
                      id="name"
                      value={newClass.name}
                      onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                      placeholder="e.g., Introduction to Computer Science"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code" className="text-sm">Class Code</Label>
                    <Input
                      id="code"
                      value={newClass.code}
                      onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                      placeholder="e.g., CS101"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacher" className="text-sm">Teacher</Label>
                    <Select value={newClass.teacherId} onValueChange={(value) => setNewClass({ ...newClass, teacherId: value })}>
                      <SelectTrigger className="mt-1">
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
                    <Label htmlFor="schedule" className="text-sm">Schedule</Label>
                    <Input
                      id="schedule"
                      value={newClass.schedule}
                      onChange={(e) => setNewClass({ ...newClass, schedule: e.target.value })}
                      placeholder="e.g., MWF 9:00-10:30 AM"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-sm">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newClass.description}
                      onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                      placeholder="Enter class description"
                      className="mt-1 text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button
                      onClick={editingClass ? handleUpdateClass : handleAddClass}
                      disabled={addClassMutation.isPending || updateClassMutation.isPending}
                      className="flex-1 text-sm"
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
                      className="flex-1 sm:flex-none text-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Classes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {filteredClasses.map((cls) => (
              <Card key={cls.id} className="shadow-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="text-primary h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">{cls.name}</CardTitle>
                        <p className="text-sm text-gray-600">{cls.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Badge variant={cls.isActive ? "default" : "secondary"} className="text-xs">
                        {cls.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {/* Mobile Actions Menu */}
                      <div className="sm:hidden">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-32 p-1" align="end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full justify-start text-xs"
                            >
                              View
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full justify-start text-xs"
                              onClick={() => handleEditClass(cls)}
                            >
                              <Edit className="mr-2 h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClass(cls.id)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Delete
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {cls.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{cls.description}</p>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    {cls.teacher && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{cls.teacher.user.name}</span>
                      </div>
                    )}
                    {cls.schedule && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{cls.schedule}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Created:</span>
                      <span>
                        {cls.createdAt ? new Date(cls.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden sm:flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="px-3"
                      onClick={() => handleEditClass(cls)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive px-3"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Mobile Actions */}
                  <div className="sm:hidden flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      View Details
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
              <p className="text-gray-600 mb-4 text-sm px-4">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "Get started by creating your first class"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)} className="mx-4">
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