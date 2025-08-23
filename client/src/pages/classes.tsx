import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, GraduationCap, Users, Clock } from "lucide-react";
import type { Class } from "@shared/schema";

export default function Classes() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState({
    name: "",
    code: "",
    description: "",
    schedule: ""
  });
  const { toast } = useToast();

  const { data: classes, isLoading } = useQuery({
    queryKey: ["/api/classes"],
  });

  const addClassMutation = useMutation({
    mutationFn: async (classData: typeof newClass) => {
      const response = await apiRequest("POST", "/api/classes", classData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setShowAddModal(false);
      setNewClass({ name: "", code: "", description: "", schedule: "" });
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

  const filteredClasses = classes?.filter((cls: Class) =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAddClass = () => {
    if (!newClass.name || !newClass.code) {
      toast({
        title: "Error",
        description: "Class name and code are required",
        variant: "destructive",
      });
      return;
    }
    addClassMutation.mutate(newClass);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex-1">
          <Header 
            title="Classes" 
            subtitle="Loading..." 
            onMenuClick={() => setIsSidebarOpen(true)}
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
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Classes" 
          subtitle="Manage your classes and enrollment"
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                  data-testid="input-search-classes"
                />
              </div>
            </div>
            
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto" data-testid="button-add-class">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="modal-add-class">
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Class Name</Label>
                    <Input
                      id="name"
                      value={newClass.name}
                      onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                      placeholder="e.g., Introduction to Computer Science"
                      data-testid="input-class-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Class Code</Label>
                    <Input
                      id="code"
                      value={newClass.code}
                      onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                      placeholder="e.g., CS101"
                      data-testid="input-class-code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule">Schedule</Label>
                    <Input
                      id="schedule"
                      value={newClass.schedule}
                      onChange={(e) => setNewClass({ ...newClass, schedule: e.target.value })}
                      placeholder="e.g., MWF 9:00-10:30 AM"
                      data-testid="input-class-schedule"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newClass.description}
                      onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                      placeholder="Enter class description"
                      data-testid="textarea-class-description"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleAddClass}
                      disabled={addClassMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-class"
                    >
                      {addClassMutation.isPending ? "Creating..." : "Create Class"}
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

          {/* Classes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {filteredClasses.map((cls: Class, index: number) => (
              <Card key={cls.id} className="shadow-sm border border-gray-200" data-testid={`class-card-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <GraduationCap className="text-primary h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg" data-testid={`class-name-${index}`}>
                          {cls.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600" data-testid={`class-code-${index}`}>
                          {cls.code}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={cls.isActive ? "default" : "secondary"}
                      data-testid={`class-status-${index}`}
                    >
                      {cls.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {cls.description && (
                    <p className="text-sm text-gray-600 mb-3" data-testid={`class-description-${index}`}>
                      {cls.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {cls.schedule && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span data-testid={`class-schedule-${index}`}>{cls.schedule}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span data-testid={`class-students-${index}`}>
                        Students enrolled
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span data-testid={`class-created-${index}`}>
                        {new Date(cls.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      data-testid={`button-view-class-${index}`}
                    >
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">View</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2"
                      data-testid={`button-edit-class-${index}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive px-2"
                      data-testid={`button-delete-class-${index}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClasses.length === 0 && (
            <div className="text-center py-12" data-testid="no-classes-message">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No classes found" : "No classes yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? "Try adjusting your search criteria"
                  : "Get started by creating your first class"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)} data-testid="button-add-first-class">
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
