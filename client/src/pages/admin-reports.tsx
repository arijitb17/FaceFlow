"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CSVLink } from "react-csv";
import { Download, Calendar, Users, CheckCircle, XCircle } from "lucide-react";
import Sidebar from "@/components/admin/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Class {
  id: string;
  name: string;
  code: string;
  teacher?: {
    user?: { name: string };
  };
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  recognized: boolean;
  confidence: number;
}

interface AttendanceSession {
  id: string;
  classId?: string;
  date?: string;
  sessionDate?: string;
  status: string;
  totalStudentsRecognized?: number;
  averageConfidence?: number;
  createdAt: string;
  students?: Student[];
}

export default function AttendanceAll() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);

  const getAuthToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const fetchWithAuth = async (url: string) => {
    const token = getAuthToken();
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
  };

  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: () => fetchWithAuth("/api/classes"),
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<AttendanceSession[]>({
    queryKey: ["/api/attendance-sessions"],
    queryFn: () => fetchWithAuth("/api/attendance-sessions"),
  });

  const isLoading = classesLoading || sessionsLoading;

  const filteredSessions = sessions.filter((session) => {
    if (!selectedDate) return true;
    const sessionDate = new Date(session.date || session.sessionDate || session.createdAt);
    const filterDate = new Date(selectedDate);

    return (
      sessionDate.getFullYear() === filterDate.getFullYear() &&
      sessionDate.getMonth() === filterDate.getMonth() &&
      sessionDate.getDate() === filterDate.getDate()
    );
  });

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Loading...
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">📊 Attendance Sessions</h1>

        {/* Date Filter */}
        <div className="mb-6 flex gap-3 items-center">
          <Calendar className="text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <Card className="shadow-lg border border-gray-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Users className="w-5 h-5 text-blue-500" /> Sessions Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSessions.length === 0 ? (
              <p className="text-gray-500">No attendance sessions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Recognized
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Confidence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSessions.map((session) => {
                      const classInfo = classes.find((c) => c.id === session.classId);
                      const sessionDate = session.date || session.sessionDate || session.createdAt;
                      const recognizedCount = session.students?.filter((s) => s.recognized).length ?? 0;
                      const totalStudents = session.students?.length ?? 0;

                      return (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {format(new Date(sessionDate), "MMM dd, yyyy HH:mm")}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {classInfo ? `${classInfo.name} (${classInfo.code})` : "Unknown Class"}
                            {classInfo?.teacher?.user?.name ? ` • ${classInfo.teacher.user.name}` : ""}
                          </td>
                          <td className="px-6 py-4 text-sm flex items-center gap-1">
                            {session.status === "completed" ? (
                              <CheckCircle className="text-green-500 w-5 h-5" />
                            ) : (
                              <XCircle className="text-red-500 w-5 h-5" />
                            )}
                            <span>{session.status}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {recognizedCount} / {totalStudents}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {session.averageConfidence
                              ? `${Math.round(session.averageConfidence * 100)}%`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <button
                              className="flex items-center gap-1 text-blue-500 hover:underline"
                              onClick={() => setSelectedSession(session)}
                            >
                              <Download className="w-4 h-4" /> CSV
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CSV Export */}
            {selectedSession && selectedSession.students && (
              <div className="mt-4">
                <CSVLink
                  data={selectedSession.students.map((s) => ({
                    studentId: s.studentId,
                    name: s.name,
                    recognized: s.recognized,
                    confidence: s.confidence,
                  }))}
                  filename={`attendance_${selectedSession.id}.csv`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600"
                >
                  <Download className="w-4 h-4" /> Download CSV for{" "}
                  {format(new Date(selectedSession.date || selectedSession.createdAt), "MMM dd")}
                </CSVLink>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
