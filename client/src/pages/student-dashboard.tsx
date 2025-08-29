"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Upload } from "lucide-react";
import type { Class } from "@shared/schema";

interface AttendanceRecord {
  id: string;
  classId: string;
  date: string;
  isPresent: boolean;
  className: string;
  classCode: string;
}

interface AuthUser {
  userId: string;  // ✅ match backend
  username: string;
  name: string;
  role: string;
  email: string;
  isActive: boolean;
  photos?: string[];
}

export default function StudentDashboard() {
  const studentId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
  const queryClient = useQueryClient();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // ---- Fetch logged-in student
  const { data: student } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch student info");
      return res.json();
    },
    enabled: !!studentId && !!token,
  });

  // ---- Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await fetch("/api/classes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
    enabled: !!studentId && !!token,
  });

  // ---- Fetch attendance
  const { data: attendanceRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
    enabled: !!studentId && !!token,
  });

  // ---- Upload student photos
  const uploadPhotosMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!studentId) throw new Error("Student ID missing");

      const formData = new FormData();
      files.forEach(file => formData.append("photos", file));
      formData.append("studentId", studentId);

      const res = await fetch("/api/face-recognition/upload-student-photos", { // ✅ fixed endpoint
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setSelectedFiles([]);
    },
    onError: (err: any) => {
      console.error("Upload failed:", err?.message || err);
    },
  });

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = () => {
    if (selectedFiles.length) uploadPhotosMutation.mutate(selectedFiles);
  };

  // ---- Attendance stats
  const totalSessions = attendanceRecords.length;
  const attended = attendanceRecords.filter(r => r.isPresent).length;
  const attendancePercentage = totalSessions ? Math.round((attended / totalSessions) * 100) : 0;
  const recentAttendance = attendanceRecords.slice(0, 5);

  // ---- Logout
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">
          Student Dashboard
        </h1>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </header>

      <main className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 text-sm">Attendance Rate</p>
              <p className="text-3xl font-bold">{attendancePercentage}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 text-sm">Classes Enrolled</p>
              <p className="text-3xl font-bold">{classes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 text-sm">Total Sessions</p>
              <p className="text-3xl font-bold">{totalSessions}</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Photos for Model Training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
              <Button
                disabled={selectedFiles.length === 0 || uploadPhotosMutation.isPending}
                onClick={handleUpload}
              >
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>

              {uploadPhotosMutation.isPending && <p>Uploading...</p>}
              {uploadPhotosMutation.isError && (
                <p className="text-red-500 mt-2">{(uploadPhotosMutation.error as Error)?.message}</p>
              )}
              {uploadPhotosMutation.isSuccess && (
                <p className="text-green-500 mt-2">Upload successful!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length > 0 ? (
              <div className="space-y-3">
                {recentAttendance.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div className="flex items-center space-x-3">
                      {r.isPresent ? (
                        <CheckCircle className="text-green-500 h-5 w-5" />
                      ) : (
                        <XCircle className="text-red-500 h-5 w-5" />
                      )}
                      <div>
                        <p className="font-medium">{r.className}</p>
                        <p className="text-sm text-gray-600">{r.classCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={r.isPresent ? "default" : "destructive"}>
                        {r.isPresent ? "Present" : "Absent"}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        {new Date(r.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No attendance records yet</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
