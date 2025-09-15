"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Mail, Calendar, Camera, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student } from "@shared/schema";

interface StudentWithUser extends Student {
  user: { name: string; email: string } | null;
}

export default function Students() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "trained" | "pending">("all");
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

  const { data: students = [], isLoading } = useQuery<StudentWithUser[]>({
    queryKey: ["/api/students/my"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students/my");
      if (!res.ok) throw new Error("Failed to fetch students");

      const json = await res.json();
      return Array.isArray(json) ? json : json.students ?? [];
    },
  });

  const filteredStudents = students.filter((student) => {
    const name = student.name?.toLowerCase() || student.user?.name?.toLowerCase() || "";
    const studentId = student.studentId?.toLowerCase() || "";
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || studentId.includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || 
      (filterStatus === "trained" && student.isTrainingComplete) ||
      (filterStatus === "pending" && !student.isTrainingComplete);
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1">
          <Header
            title="Students"
            subtitle="Manage your students and enrollment"
            onMenuClick={() => setIsSidebarOpen(true)}
            userName={userName ?? "Loading..."}
          />
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
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
          title="Students"
          subtitle="Manage your students and enrollment"
          onMenuClick={() => setIsSidebarOpen(true)}
          userName={userName ?? "Loading..."}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative flex-1 w-full sm:w-auto sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="flex items-center space-x-2 flex-1 sm:flex-none">
                <Filter className="h-4 w-4 text-gray-500 sm:hidden" />
                <Select value={filterStatus} onValueChange={(value: "all" | "trained" | "pending") => setFilterStatus(value)}>
                  <SelectTrigger className="w-full sm:w-32 text-sm">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="trained">Trained</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-gray-500 whitespace-nowrap">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Students Grid */}
          {filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="text-gray-600 h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm sm:text-base truncate">
                            {student.user?.name || student.name}
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            ID: {student.studentId}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={student.isTrainingComplete ? "default" : "secondary"} 
                        className="text-xs flex-shrink-0"
                      >
                        {student.isTrainingComplete ? "Trained" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Contact Info */}
                    <div className="flex items-center space-x-2 text-xs sm:text-sm">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate text-gray-600">
                        {student.user?.email || student.email || "Not provided"}
                      </span>
                    </div>
                    
                    {/* Photos Count */}
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <Camera className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        <span className="text-gray-600">Photos:</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {student.photos?.length || 0}
                      </span>
                    </div>
                    
                    {/* Enrollment Date */}
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        <span className="text-gray-600">Enrolled:</span>
                      </div>
                      <span className="text-gray-900">
                        {student.createdAt
                          ? new Date(student.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className={`flex items-center space-x-2 text-xs ${
                        student.isTrainingComplete 
                          ? 'text-green-600' 
                          : student.photos?.length && student.photos.length > 0 
                            ? 'text-orange-600' 
                            : 'text-red-600'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          student.isTrainingComplete 
                            ? 'bg-green-500' 
                            : student.photos?.length && student.photos.length > 0 
                              ? 'bg-orange-500' 
                              : 'bg-red-500'
                        }`}></div>
                        <span className="font-medium">
                          {student.isTrainingComplete 
                            ? 'Ready for recognition' 
                            : student.photos?.length && student.photos.length > 0 
                              ? 'Photos uploaded, needs training'
                              : 'No photos uploaded'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterStatus !== "all" ? "No students found" : "No students yet"}
              </h3>
              <p className="text-gray-600 mb-4 text-sm px-4">
                {searchQuery || filterStatus !== "all"
                  ? "Try adjusting your search criteria or filters"
                  : "You have no students assigned yet"}
              </p>
              {(searchQuery || filterStatus !== "all") && (
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery("")}
                    className="text-sm"
                  >
                    Clear Search
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setFilterStatus("all")}
                    className="text-sm"
                  >
                    Show All
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Summary Stats - Mobile */}
          {filteredStudents.length > 0 && (
            <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">
                  {students.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {students.filter(s => s.isTrainingComplete).length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Trained</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">
                  {students.filter(s => !s.isTrainingComplete && (s.photos?.length || 0) > 0).length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Need Training</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-red-600">
                  {students.filter(s => !s.photos?.length || s.photos.length === 0).length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">No Photos</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}