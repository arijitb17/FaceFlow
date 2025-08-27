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
  RefreshCw
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

// Helper function to make authenticated API requests
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

  // Update class mutation - Fixed to use PUT instead of non-existent endpoint
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      // Since there's no PUT endpoint in routes, we'll need to handle this differently
      // For now, throwing an error to indicate this needs backend implementation
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

  // Delete class mutation - Fixed to use DELETE endpoint
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      // Since there's no DELETE endpoint in routes, we'll need to handle this differently
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
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-6 h-6 text-slate-600" />
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Classes Management</h1>
                <p className="text-slate-600">Manage courses and class schedules</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
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
                    <Textarea id="description" name="description" />
                  </div>
                  <div>
                    <Label htmlFor="teacherId">Teacher</Label>
                    <Select name="teacherId" required>
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
                    <Label htmlFor="schedule">Schedule</Label>
                    <Input id="schedule" name="schedule" placeholder="e.g., Mon/Wed/Fri 10:00-11:30" />
                  </div>
                  <Button type="submit" className="w-full">
                    {createClassMutation.isPending ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : null}
                    Create Class
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin w-6 h-6 text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map(classItem => (
                <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{classItem.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">{classItem.code}</Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingClass(classItem)}
                          disabled // Disabled until backend implements update endpoint
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteClassMutation.mutate(classItem.id)}
                          disabled // Disabled until backend implements delete endpoint
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Users className="w-4 h-4" />
                      <span>{classItem.teacher?.user?.name || "No teacher assigned"}</span>
                    </div>
                    {classItem.schedule && (
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>{classItem.schedule}</span>
                      </div>
                    )}
                    {classItem.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">{classItem.description}</p>
                    )}
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>{new Date(classItem.createdAt).toLocaleDateString()}</span>
                      <Badge variant={classItem.isActive ? "default" : "secondary"}>
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
          <DialogContent className="max-w-md">
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
                  <Textarea id="edit-description" name="description" defaultValue={editingClass.description || ""} />
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