// ===== ADMIN REPORTS - Mobile Fixed =====
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid } from "date-fns";
import { CSVLink } from "react-csv";
import { Download, Calendar, Users, CheckCircle, XCircle, Filter, Menu } from "lucide-react";

import Sidebar from "@/components/admin/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Class {
  id: string;
  name: string;
  code: string;
  teacher?: { user?: { name: string } };
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
  const [showFilters, setShowFilters] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getAuthToken = () => typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const fetchWithAuth = async <T,>(url: string): Promise<T> => {
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
    queryKey: ["classes"],
    queryFn: () => fetchWithAuth<Class[]>("/api/classes"),
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<AttendanceSession[]>({
    queryKey: ["attendance-sessions"],
    queryFn: () => fetchWithAuth<AttendanceSession[]>("/api/attendance-sessions"),
  });

  const isLoading = classesLoading || sessionsLoading;

  // Helper function to safely format dates
const formatSessionDate = (session: AttendanceSession) => {
  const rawDate = session.date || session.sessionDate || session.createdAt;

  if (!rawDate) {
    return { date: "N/A", time: "--:--" };
  }

  // Normalize string: handle "YYYY-MM-DD HH:mm:ss"
  const safeDateStr = rawDate.toString().replace(" ", "T");

  const dateObj = new Date(safeDateStr);

  if (!isValid(dateObj)) {
    console.warn("Invalid date for session:", rawDate);
    return { date: "N/A", time: "--:--" };
  }

  return {
    date: format(dateObj, "MMM dd, yyyy"),
    time: format(dateObj, "HH:mm"),
  };
};


  const filteredSessions = sessions.filter((session) => {
    if (!selectedDate) return true;
    const sessionDate = new Date(session.date || session.sessionDate || session.createdAt);
    if (!isValid(sessionDate)) return false;
    
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-50">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4 sm:p-6">
          <div className="flex justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden p-2"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </Button>

              <Users className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <h1 className="text-lg sm:text-2xl xl:text-3xl font-bold text-gray-800 truncate">
                Attendance Reports
              </h1>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden whitespace-nowrap"
            >
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>

          {/* Filters */}
          <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="flex items-center text-sm font-medium text-gray-700 whitespace-nowrap">
                <Calendar className="text-gray-500 w-4 h-4 mr-2 flex-shrink-0" />
                Filter by date:
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 px-3 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm flex-1 sm:flex-none"
                />
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate("")}
                    className="text-gray-500 px-2"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Table/Card */}
        <div className="p-4 sm:p-6">
          <Card className="shadow-lg border border-gray-200">
            <CardHeader className="bg-blue-50 border-b px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-gray-700 text-base sm:text-lg">
                <Users className="w-5 h-5 text-blue-500" />
                Sessions ({filteredSessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No attendance sessions found.</p>
                  {selectedDate && (
                    <p className="text-sm text-gray-400 mt-2">
                      Try selecting a different date
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="table-auto w-full divide-y divide-gray-200">

                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Class
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Students
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Confidence
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSessions.map((session) => {
                          const classInfo = classes.find((c) => c.id === session.classId);
                          const { date: formattedDate, time: formattedTime } = formatSessionDate(session);
                          const recognizedCount = session.students?.filter((s) => s.recognized).length ?? 0;
                          const totalStudents = session.students?.length ?? 0;

                          return (
                            <tr key={session.id} className="hover:bg-gray-50">
                              {/* Date & Time Column */}
                              <td className="px-4 py-4 min-w-[200px] align-top">
  <div className="flex flex-col text-sm">
    <span className="font-medium text-gray-900">
      {formattedDate && formattedDate !== "N/A" ? formattedDate : <span className="text-red-500">N/A</span>}
    </span>
    <span className="text-gray-500 text-xs">
      {formattedTime && formattedTime !== "--:--" ? formattedTime : <span className="text-red-400">--:--</span>}
    </span>
  </div>
</td>


                              {/* Class Column */}
                              <td className="px-4 py-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900 truncate max-w-xs">
                                    {classInfo ? `${classInfo.name} (${classInfo.code})` : "Unknown Class"}
                                  </div>
                                  {classInfo?.teacher?.user?.name && (
                                    <div className="text-gray-500 text-xs truncate max-w-xs">
                                      {classInfo.teacher.user.name}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Status Column */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {session.status === "completed" ? (
                                    <CheckCircle className="text-green-500 w-4 h-4 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="text-red-500 w-4 h-4 flex-shrink-0" />
                                  )}
                                  <Badge
                                    variant={session.status === "completed" ? "default" : "destructive"}
                                    className="text-xs"
                                  >
                                    {session.status}
                                  </Badge>
                                </div>
                              </td>

                              {/* Students Column */}
                              <td className="px-4 py-4 whitespace-nowrap text-center">
  <div className="text-sm flex justify-center items-center space-x-1">
    <span className="font-medium text-gray-900">{recognizedCount}</span>
    <span className="text-gray-500 text-xs">/ {totalStudents}</span>
  </div>
</td>


                              {/* Confidence Column */}
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900">
                                  {session.averageConfidence
                                    ? `${Math.round(session.averageConfidence * 100)}%`
                                    : "N/A"}
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedSession(session)}
                                  className="text-xs flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Export
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden">
                    {filteredSessions.map((session) => {
                      const classInfo = classes.find((c) => c.id === session.classId);
                      const { date: formattedDate, time: formattedTime } = formatSessionDate(session);
                      const recognizedCount = session.students?.filter((s) => s.recognized).length ?? 0;
                      const totalStudents = session.students?.length ?? 0;

                      return (
                        <div
                          key={session.id}
                          className="border-b border-gray-200 p-4 hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                {formattedDate}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formattedTime}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {session.status === "completed" ? (
                                <CheckCircle className="text-green-500 w-4 h-4" />
                              ) : (
                                <XCircle className="text-red-500 w-4 h-4" />
                              )}
                              <Badge
                                variant={
                                  session.status === "completed" ? "default" : "destructive"
                                }
                                className="text-xs"
                              >
                                {session.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-gray-500">
                                Class:
                              </span>
                              <div className="text-sm text-gray-900 truncate">
                                {classInfo
                                  ? `${classInfo.name} (${classInfo.code})`
                                  : "Unknown Class"}
                              </div>
                              {classInfo?.teacher?.user?.name && (
                                <div className="text-xs text-gray-500 truncate">
                                  Teacher: {classInfo.teacher.user.name}
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between text-sm gap-4">
                              <div className="min-w-0">
                                <span className="text-xs font-medium text-gray-500 block">
                                  Attendance:
                                </span>
                                <div className="font-medium">
                                  {recognizedCount} / {totalStudents}
                                </div>
                              </div>
                              <div className="min-w-0 text-right">
                                <span className="text-xs font-medium text-gray-500 block">
                                  Confidence:
                                </span>
                                <div className="font-medium">
                                  {session.averageConfidence
                                    ? `${Math.round(session.averageConfidence * 100)}%`
                                    : "N/A"}
                                </div>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSession(session)}
                            className="w-full flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" /> Export CSV
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* CSV Export */}
              {selectedSession?.students && (
                <div className="p-4 border-t bg-gray-50">
                  <CSVLink
                    data={selectedSession.students.map((s) => ({
                      studentId: s.studentId,
                      name: s.name,
                      recognized: s.recognized,
                      confidence: s.confidence,
                    }))}
                    filename={`attendance_${selectedSession.id}.csv`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition-colors w-full sm:w-auto justify-center"
                  >
                    <Download className="w-4 h-4" /> Download CSV for{" "}
                    {formatSessionDate(selectedSession).date}
                  </CSVLink>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}