"use client";

import { useState,useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User } from "lucide-react";
import type { Student } from "@shared/schema";

interface StudentWithUser extends Student {
  user: { name: string; email: string } | null;
}

export default function Students() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

const { data: students = [], isLoading } = useQuery<StudentWithUser[]>({
  queryKey: ["/api/students/my"],
  queryFn: async () => {
    const res = await apiRequest("GET", "/api/students/my");
    if (!res.ok) throw new Error("Failed to fetch students");

    const json = await res.json();
    // Return the array directly
    return Array.isArray(json) ? json : json.students ?? [];
  },
});

  const filteredStudents = students.filter((student) => {
    const name = student.name?.toLowerCase() || student.user?.name?.toLowerCase() || "";
    const studentId = student.studentId?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase()) || studentId.includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
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

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Search */}
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
          </div>

          {/* Students Grid */}
          {filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {filteredStudents.map((student) => (
                <Card key={student.id}>
                  <CardHeader className="pb-3 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="text-gray-600 h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle>{student.user?.name || student.name}</CardTitle>
                        <p className="text-sm text-gray-600">ID: {student.studentId}</p>
                      </div>
                    </div>
                    <Badge variant={student.isTrainingComplete ? "default" : "secondary"}>
                      {student.isTrainingComplete ? "Trained" : "Pending"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span>{student.user?.email || student.email || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Photos:</span> <span>{student.photos?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Enrolled:</span>{" "}
                      <span>
                        {student.createdAt
                          ? new Date(student.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No students found" : "No students yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "You have no students assigned yet"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
