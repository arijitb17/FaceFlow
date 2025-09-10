"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut,Upload } from "lucide-react";
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
  userId: string;
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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const handlePrevMonth = () => setCurrentMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const handleNextMonth = () => setCurrentMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

  // ---- Fetch student info
  const { data: student } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch student info");
      return res.json();
    },
    enabled: !!studentId && !!token,
  });

  // ---- Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await fetch("/api/classes", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
    enabled: !!studentId && !!token,
  });

  // ---- Fetch attendance
  const { data: attendanceRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/${studentId}`, { headers: { Authorization: `Bearer ${token}` } });
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

      const res = await fetch("/api/face-recognition/upload-student-photos", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");
      return data;
    },
    onSuccess: () => {
      setSelectedFiles([]);
    },
    onError: (err: any) => console.error("Upload failed:", err?.message || err),
  });

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };
  const handleUpload = () => selectedFiles.length && uploadPhotosMutation.mutate(selectedFiles);

  // ---- Attendance stats
  const totalSessions = attendanceRecords.length;
  const attended = attendanceRecords.filter(r => r.isPresent).length;
  const attendancePercentage = totalSessions ? Math.round((attended / totalSessions) * 100) : 0;

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  const { year, month } = currentMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const calendarDays: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Student Dashboard</h1>
        <Button variant="outline" onClick={handleLogout} className="hover:bg-red-500 hover:text-white"><LogOut className="w-5 h-5 mr-3" />
              Logout</Button>
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
              <p className="text-3xl font-bold">{Array.from(new Set(attendanceRecords.map(r => r.classId))).length}</p>
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
          <CardHeader><CardTitle>Upload Photos for Model Training</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
              <Button disabled={selectedFiles.length === 0 || uploadPhotosMutation.isPending} onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>
              {uploadPhotosMutation.isPending && <p>Uploading...</p>}
              {uploadPhotosMutation.isError && <p className="text-red-500 mt-2">{(uploadPhotosMutation.error as Error)?.message}</p>}
              {uploadPhotosMutation.isSuccess && <p className="text-green-500 mt-2">Upload successful!</p>}
            </div>
          </CardContent>
        </Card>
        {/* Attendance Calendar */}
        <Card>
          <CardHeader><CardTitle>Attendance Calendar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <Button onClick={handlePrevMonth}>{"< Prev"}</Button>
              <h2 className="font-semibold text-lg">{new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })}</h2>
              <Button onClick={handleNextMonth}>{"Next >"}</Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs lg:text-sm">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="font-semibold text-gray-600 p-1">{d}</div>)}
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={idx}></div>;
                const recordsForDay = attendanceRecords.filter(r => {
                  const date = new Date(r.date);
                  return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
                });
                return (
                  <div key={idx} className="p-1 rounded border border-gray-200 min-h-[3rem] flex flex-col justify-start gap-1">
                    <div className="text-xs font-medium mb-1">{day}</div>
                    <div className="flex flex-wrap gap-0.5 max-h-12 overflow-y-auto">
                      {recordsForDay.length > 0 ? recordsForDay.map((r, i) => (
                        <div key={i} className={`text-[10px] px-1 py-0.5 rounded ${r.isPresent ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`} title={`${r.className}: ${r.isPresent ? "Present" : "Absent"}`}>
                          {r.classCode || r.className}
                        </div>
                      )) : <div className="text-gray-300 text-[10px]">No class</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
              <div className="flex items-center space-x-1"><div className="w-4 h-4 bg-green-500 rounded"></div><span>Present</span></div>
              <div className="flex items-center space-x-1"><div className="w-4 h-4 bg-red-500 rounded"></div><span>Absent</span></div>
              <div className="flex items-center space-x-1"><div className="w-4 h-4 bg-gray-200 rounded"></div><span>No Class</span></div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
