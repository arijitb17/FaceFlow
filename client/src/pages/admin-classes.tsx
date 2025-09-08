"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Class {
  id: string;
  name: string;
  courseCode: string;
}

export default function AdminClasses() {
  const queryClient = useQueryClient();
  const [newClass, setNewClass] = useState({ name: "", courseCode: "" });
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  // Fetch all classes
  const { data: classes, isLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
  });

  // Create class
  const createClassMutation = useMutation({
    mutationFn: async () => {
      // Validate input
      if (!newClass.name.trim() || !newClass.courseCode.trim()) {
        throw new Error("Both class name and course code are required");
      }

      const res = await apiRequest("POST", "/api/classes", newClass);
      
      if (!res.ok) {
        // Try to get error message from response
        const errorText = await res.text();
        let errorMessage = "Failed to create class";
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If it's not JSON, it might be HTML error page
          if (errorText.includes("<!DOCTYPE")) {
            errorMessage = "Server error - check server logs";
          } else {
            errorMessage = errorText || errorMessage;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Class created successfully" });
      setNewClass({ name: "", courseCode: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update class
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const res = await apiRequest("PUT", `/api/classes/${id}`, updates);
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Failed to update class";
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          if (errorText.includes("<!DOCTYPE")) {
            errorMessage = "Server error - check server logs";
          }
        }
        
        throw new Error(errorMessage);
      }
      
      return res.json();
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
        variant: "destructive",
      });
    },
  });

  // Delete class
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/classes/${id}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Failed to delete class";
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          if (errorText.includes("<!DOCTYPE")) {
            errorMessage = "Server error - check server logs";
          }
        }
        
        throw new Error(errorMessage);
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Class deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class",
        variant: "destructive",
      });
    },
  });

  const handleCreateClass = () => {
    if (!newClass.name.trim() || !newClass.courseCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Both class name and course code are required",
        variant: "destructive",
      });
      return;
    }
    createClassMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Add new class form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Class</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Class name"
            value={newClass.name}
            onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
          />
          <Input
            placeholder="Course code"
            value={newClass.courseCode}
            onChange={(e) =>
              setNewClass({ ...newClass, courseCode: e.target.value })
            }
          />
          <Button 
            onClick={handleCreateClass}
            disabled={createClassMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-1" /> 
            {createClassMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </CardContent>
      </Card>

      {/* List classes */}
      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : classes && classes.length > 0 ? (
            <ul className="space-y-2">
              {classes.map((classItem) => (
                <li
                  key={classItem.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{classItem.name}</p>
                    <p className="text-sm text-gray-500">
                      {classItem.courseCode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingClass(classItem)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteClassMutation.mutate(classItem.id)
                      }
                      disabled={deleteClassMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No classes found</p>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingClass} onOpenChange={() => setEditingClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Class name"
              value={editingClass?.name || ""}
              onChange={(e) =>
                setEditingClass(
                  editingClass
                    ? { ...editingClass, name: e.target.value }
                    : null
                )
              }
            />
            <Input
              placeholder="Course code"
              value={editingClass?.courseCode || ""}
              onChange={(e) =>
                setEditingClass(
                  editingClass
                    ? { ...editingClass, courseCode: e.target.value }
                    : null
                )
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingClass(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  editingClass &&
                  updateClassMutation.mutate(editingClass)
                }
                disabled={updateClassMutation.isPending}
              >
                {updateClassMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}