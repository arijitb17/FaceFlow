"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Plus,
  Users,
  Calendar,
  Edit,
  Trash2,
  RefreshCw,
  Menu
} from "lucide-react";
import Sidebar from "@/components/admin/sidebar";

interface Class {
  id: string;
  name: string;
  code: string;
  description?: string;
  teacherId: string;
  schedule?: string;
  isActive: boolean;
  createdAt: string;
  teacher?: {
    id: string;
    user: { name: string; email: string };
  } | null;
}

interface Teacher {
  id: string;
  userId: string;
  department?: string;
  employeeId?: string;
  user: { name: string; email: string };
}

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

export default function AdminClasses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch classes
  const { data: classes = [], isLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      return res.json();
    }
  });

  // Fetch teachers
  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/teachers");
      return res.json();
    }
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (classData: any) => {
      const res = await apiRequest("POST", "/api/classes", classData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Class created successfully" });
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create class", 
        variant: "destructive" 
      });
    }
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      throw new Error("Update class endpoint not implemented in backend");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Class updated successfully" });
      setEditingClass(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update class", 
        variant: "destructive" 
      });
    }
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      throw new Error("Delete class endpoint not implemented in backend");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Class deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete class", 
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, ...data });
    } else {
      createClassMutation.mutate(data);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">Classes</h1>
                <p className="text-xs sm:text-base text-slate-600 hidden sm:block truncate">
                  Manage courses and class schedules
                </p>
              </div>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 whitespace-nowrap w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Class</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Class Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="code">Class Code</Label>
                    <Input id="code" name="code" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" className="min-h-[80px] resize-none" />
                  </div>
                  <div>
                    <Label htmlFor="teacherId">Teacher</Label>
                    <Select name="teacherId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="schedule">Schedule</Label>
                    <Input
                      id="schedule"
                      name="schedule"
                      placeholder="e.g., Mon/Wed/Fri 10:00-11:30"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full flex items-center justify-center gap-2"
                    disabled={createClassMutation.isPending}
                  >
                    {createClassMutation.isPending && <RefreshCw className="animate-spin w-4 h-4" />}
                    Create Class
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin w-6 h-6 text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {classes.map(classItem => (
                <Card key={classItem.id} className="w-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">{classItem.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1 text-xs">{classItem.code}</Badge>
                      </div>
                      <div className="flex space-x-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingClass(classItem)}
                          disabled
                          className="p-2"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteClassMutation.mutate(classItem.id)}
                          disabled
                          className="p-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-slate-600 truncate">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{classItem.teacher?.user?.name || "No teacher assigned"}</span>
                    </div>
                    {classItem.schedule && (
                      <div className="flex items-center space-x-2 text-sm text-slate-600 truncate">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{classItem.schedule}</span>
                      </div>
                    )}
                    {classItem.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">{classItem.description}</p>
                    )}
                    <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t">
                      <span>{new Date(classItem.createdAt).toLocaleDateString()}</span>
                      <Badge variant={classItem.isActive ? "default" : "secondary"} className="text-xs">
                        {classItem.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Edit Dialog */}
        <Dialog open={editingClass !== null} onOpenChange={() => setEditingClass(null)}>
          <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
            </DialogHeader>
            {editingClass && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Class Name</Label>
                  <Input id="edit-name" name="name" defaultValue={editingClass.name} required />
                </div>
                <div>
                  <Label htmlFor="edit-code">Class Code</Label>
                  <Input id="edit-code" name="code" defaultValue={editingClass.code} required />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea 
                    id="edit-description" 
                    name="description" 
                    defaultValue={editingClass.description || ""} 
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-teacherId">Teacher</Label>
                  <Select name="teacherId" defaultValue={editingClass.teacherId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-schedule">Schedule</Label>
                  <Input id="edit-schedule" name="schedule" defaultValue={editingClass.schedule || ""} />
                </div>
                <Button type="submit" className="w-full" disabled>
                  {updateClassMutation.isPending ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : null}
                  Save Changes (Not Implemented)
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
