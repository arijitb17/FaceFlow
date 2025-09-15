"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Search, Calendar as CalendarIcon, BarChart3, Users, TrendingUp, FileText, Filter, Eye, List, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type AttendanceStudent = {
  id: string;
  name: string;
  studentId: string;
  recognized: boolean;
  confidence?: number;
};

type AttendanceSession = {
  id: string;
  classId?: string;
  date?: string;
  students: AttendanceStudent[];
  status?: string;
  createdAt?: string;
  totalImages?: number;
  totalFacesDetected?: number;
  totalStudentsRecognized?: number;
  averageConfidence?: number;
};

type Class = {
  id: string;
  name: string;
  code: string;
};

type ColorKey = "blue" | "green" | "purple" | "orange";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: ColorKey;
}

export default function Reports() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [userName, setUserName] = useState<string | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

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

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<AttendanceSession[]>({
    queryKey: ["/api/attendance-sessions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/attendance-sessions");
      return (await res.json()) ?? [];
    },
  });

  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      return (await res.json()) ?? [];
    },
  });

  const filteredSessions = sessions.filter((session) => {
    const cls = classes.find((c) => c.id === session.classId);
    const searchLower = searchQuery.toLowerCase();

    if (selectedClass !== "all" && (session.classId ?? "none") !== selectedClass) return false;
    if (selectedDate && session.date) {
      const sessionDay = format(new Date(session.date), "yyyy-MM-dd");
      const selectedDay = format(selectedDate, "yyyy-MM-dd");
      if (sessionDay !== selectedDay) return false;
    }
    if (searchQuery) {
      if (!cls) return false;
      if (!cls.name.toLowerCase().includes(searchLower) && !cls.code.toLowerCase().includes(searchLower)) return false;
    }

    return true;
  });

  const totalSessions = filteredSessions.length;
  const totalStudentsRecognized = filteredSessions.reduce(
    (sum, s) => sum + (s.students?.filter((st) => st.recognized).length ?? 0),
    0
  );
  const averageAttendance = totalSessions ? Math.round(totalStudentsRecognized / totalSessions) : 0;

  const averageAccuracy =
    totalSessions > 0
      ? filteredSessions.reduce((sum, s) => {
          const studentCount = s.students?.length ?? 0;
          if (studentCount === 0) return sum;
          const sessionAccuracy = s.students!.reduce((ssum, st) => ssum + (st.confidence ?? 0), 0) / studentCount;
          return sum + sessionAccuracy;
        }, 0) / totalSessions
      : 0;

  const exportToCSV = () => {
    if (!filteredSessions.length) return;
    
    if (showDetailedView) {
      // Export individual student records
      const csvData = filteredSessions.flatMap((session) => {
        const cls = classes.find((c) => c.id === session.classId);
        return session.students?.map((st) => ({
          Class: cls?.name || "Unknown",
          "Class Code": cls?.code || "N/A",
          Date: session.date ? format(new Date(session.date), "yyyy-MM-dd HH:mm") : "N/A",
          "Student ID": st.studentId,
          Name: st.name,
          Status: st.recognized ? "Present" : "Absent",
          Confidence: st.confidence ? `${(st.confidence * 100).toFixed(1)}%` : "N/A",
          "Session Status": session.status || "Unknown",
        })) ?? [];
      });
      
      if (!csvData.length) return;
      const csv = [Object.keys(csvData[0]).join(","), ...csvData.map((row) => Object.values(row).map((v) => `"${v}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `student-attendance-details-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // Export class-level session data
      const csvData = filteredSessions.map((session) => {
        const cls = classes.find((c) => c.id === session.classId);
        const totalStudents = session.students?.length || 0;
        const presentStudents = session.students?.filter(st => st.recognized).length || 0;
        const absentStudents = totalStudents - presentStudents;
        const attendanceRate = totalStudents > 0 ? ((presentStudents / totalStudents) * 100).toFixed(1) : "0.0";
        
        const recognizedStudents = session.students?.filter(st => st.recognized) || [];
        const avgConfidence = recognizedStudents.length > 0 
          ? recognizedStudents.reduce((sum, st) => sum + (st.confidence || 0), 0) / recognizedStudents.length 
          : 0;

        return {
          Class: cls?.name || "Unknown",
          "Class Code": cls?.code || "N/A",
          Date: session.date ? format(new Date(session.date), "yyyy-MM-dd HH:mm") : "N/A",
          "Total Students": totalStudents,
          "Present": presentStudents,
          "Absent": absentStudents,
          "Attendance Rate": `${attendanceRate}%`,
          "Avg Confidence": avgConfidence > 0 ? `${(avgConfidence * 100).toFixed(1)}%` : "N/A",
          Status: session.status || "Unknown",
        };
      });
      
      if (!csvData.length) return;
      const csv = [Object.keys(csvData[0]).join(","), ...csvData.map((row) => Object.values(row).map((v) => `"${v}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `class-attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportSessionToCSV = (session: AttendanceSession) => {
    const cls = classes.find((c) => c.id === session.classId);
    
    if (!session.students || session.students.length === 0) {
      alert("No student data available for this session");
      return;
    }

    const csvData = session.students.map((student, index) => ({
      "S.No": index + 1,
      "Class Name": cls?.name || "Unknown",
      "Class Code": cls?.code || "N/A", 
      "Session Date": session.date ? format(new Date(session.date), "dd/MM/yyyy") : "N/A",
      "Session Time": session.date ? format(new Date(session.date), "HH:mm") : "N/A",
      "Student ID/Roll No": student.studentId,
      "Student Name": student.name,
      "Attendance Status": student.recognized ? "Present" : "Absent",
      "Recognition Confidence": student.confidence ? `${(student.confidence * 100).toFixed(1)}%` : "N/A",
      "Session Status": session.status || "Unknown"
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : `"${value}"`
        ).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const sessionDate = session.date ? format(new Date(session.date), "yyyy-MM-dd") : "unknown";
    const className = cls?.code || cls?.name?.replace(/\s+/g, '-') || "unknown";
    link.download = `${className}-attendance-${sessionDate}-individual-students.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  if (sessionsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1">
          <Header title="Reports" subtitle="Loading..." onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="p-4 lg:p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
            ))}
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
          title="Reports"
          subtitle="View your class Reports"
          onMenuClick={() => setIsSidebarOpen(true)}
          userName={userName ?? "Loading..."} 
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatCard title="Total Sessions" value={totalSessions} icon={<BarChart3 />} color="blue" />
            <StatCard title="Avg Attendance" value={averageAttendance} icon={<Users />} color="green" />
            <StatCard title="Students Recognized" value={totalStudentsRecognized} icon={<TrendingUp />} color="purple" />
            <StatCard title="Avg Accuracy" value={`${(averageAccuracy * 100).toFixed(1)}%`} icon={<FileText />} color="orange" />
          </div>

          {/* Filters */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailedView(!showDetailedView)}
                  className="flex items-center space-x-2 w-full sm:w-auto"
                >
                  {showDetailedView ? <List className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showDetailedView ? "Class View" : "Student Details"}</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SearchFilter value={searchQuery} onChange={setSearchQuery} />
                <ClassFilter classes={classes} selectedClass={selectedClass} setSelectedClass={setSelectedClass} />
                <DateFilter date={selectedDate} setDate={setSelectedDate} />
                <Button onClick={exportToCSV} disabled={!filteredSessions.length} className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  <Download className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Export All CSV</span>
                  <span className="sm:hidden">Export CSV</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reports */}
          <ReportsContent 
            sessions={filteredSessions} 
            classes={classes} 
            showDetailedView={showDetailedView} 
            exportSessionToCSV={exportSessionToCSV}
            expandedSessions={expandedSessions}
            toggleSessionExpansion={toggleSessionExpansion}
          />
        </main>
      </div>
    </div>
  );
}

// -------------------- Helper Components --------------------
function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses: Record<ColorKey, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardContent className="p-3 sm:p-6 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-gray-600 text-xs sm:text-sm font-medium truncate">{title}</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 truncate">{value}</p>
        </div>
        <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
          <div className="scale-75 sm:scale-100">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor="search" className="text-sm">Search</Label>
      <div className="relative mt-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input id="search" placeholder="Search classes..." value={value} onChange={(e) => onChange(e.target.value)} className="pl-10 text-sm" />
      </div>
    </div>
  );
}

function ClassFilter({ classes, selectedClass, setSelectedClass }: { classes: Class[]; selectedClass: string; setSelectedClass: (v: string) => void }) {
  return (
    <div>
      <Label className="text-sm">Class</Label>
      <Select value={selectedClass} onValueChange={setSelectedClass}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((cls) => (
            <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.code})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateFilter({ date, setDate }: { date?: Date; setDate: (d?: Date) => void }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  return (
    <div>
      <Label className="text-sm">Date</Label>
      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal mt-1 text-sm", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{date ? format(date, "MMM dd, yyyy") : "Pick a date"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar initialFocus mode="single" defaultMonth={date} selected={date} onSelect={setDate} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ReportsContent({ 
  sessions, 
  classes, 
  showDetailedView, 
  exportSessionToCSV,
  expandedSessions,
  toggleSessionExpansion
}: { 
  sessions: AttendanceSession[]; 
  classes: Class[]; 
  showDetailedView: boolean;
  exportSessionToCSV: (session: AttendanceSession) => void;
  expandedSessions: Set<string>;
  toggleSessionExpansion: (sessionId: string) => void;
}) {
  if (!sessions.length) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
        <p className="text-gray-600 text-sm px-4">No attendance sessions match your current filters</p>
      </div>
    );
  }

  if (showDetailedView) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
            <List className="h-5 w-5" />
            <span>Student Details ({sessions.flatMap(s => s.students || []).length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="block lg:hidden">
            <div className="space-y-3 p-3 sm:p-4">
              {sessions.map((session) => {
                const cls = classes.find((c) => c.id === session.classId);
                const sessionDate = session.date ? new Date(session.date) : undefined;
                const isExpanded = expandedSessions.has(session.id);
                
                return (
                  <Card key={session.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 truncate">{cls?.name || "Unknown"}</h4>
                          <p className="text-sm text-gray-500">{cls?.code || "N/A"}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {sessionDate ? format(sessionDate, "MMM dd, yyyy HH:mm") : "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => exportSessionToCSV(session)}
                            className="px-2"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => toggleSessionExpansion(session.id)}
                            className="px-2"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        {session.students?.length || 0} students
                      </div>

                      {isExpanded && (
                        <div className="space-y-2 border-t pt-3">
                          {(session.students || []).map((student) => (
                            <div key={student.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.studentId}</p>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  student.recognized ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}>
                                  {student.recognized ? "Present" : "Absent"}
                                </span>
                                {student.confidence && (
                                  <span className="text-xs text-gray-500">
                                    {(student.confidence * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Confidence</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => {
                  const cls = classes.find((c) => c.id === session.classId);
                  const sessionDate = session.date ? new Date(session.date) : undefined;
                  return (
                    <>
                      {(session.students ?? []).map((st, idx) => (
                        <tr key={`${session.id}-${st.id}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4">{cls?.name || "Unknown"}</td>
                          <td className="px-6 py-4">{sessionDate ? format(sessionDate, "MMM dd, yyyy HH:mm") : "N/A"}</td>
                          <td className="px-6 py-4">{st.studentId}</td>
                          <td className="px-6 py-4">{st.name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              st.recognized ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                              {st.recognized ? "Present" : "Absent"}
                            </span>
                          </td>
                          <td className="px-6 py-4">{st.confidence ? `${(st.confidence * 100).toFixed(1)}%` : "N/A"}</td>
                          {idx === 0 && (
                            <td rowSpan={session.students?.length} className="px-6 py-4">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => exportSessionToCSV(session)}
                                className="flex items-center space-x-1"
                              >
                                <Download className="h-4 w-4" />
                                <span>CSV</span>
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Class-level view
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
          <BarChart3 className="h-5 w-5" />
          <span>Attendance Sessions ({sessions.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {/* Mobile Card View */}
        <div className="block xl:hidden">
          <div className="space-y-3 p-3 sm:p-4">
            {sessions.map((session) => {
              const cls = classes.find((c) => c.id === session.classId);
              const sessionDate = session.date ? new Date(session.date) : undefined;
              const totalStudents = session.students?.length || 0;
              const presentStudents = session.students?.filter(st => st.recognized).length || 0;
              const absentStudents = totalStudents - presentStudents;
              const attendanceRate = totalStudents > 0 ? ((presentStudents / totalStudents) * 100).toFixed(1) : "0.0";
              
              const recognizedStudents = session.students?.filter(st => st.recognized) || [];
              const avgConfidence = recognizedStudents.length > 0 
                ? recognizedStudents.reduce((sum, st) => sum + (st.confidence || 0), 0) / recognizedStudents.length 
                : 0;

              return (
                <Card key={session.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">{cls?.name || "Unknown"}</h4>
                        <p className="text-sm text-gray-500">{cls?.code || "N/A"}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {sessionDate ? format(sessionDate, "MMM dd, yyyy") : "N/A"}
                          {sessionDate && (
                            <span className="ml-2">
                              {format(sessionDate, "HH:mm")}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          session.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          session.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status === 'completed' ? 'Completed' :
                           session.status === 'processing' ? 'Processing' :
                           session.status === 'failed' ? 'Failed' :
                           'Unknown'}
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => exportSessionToCSV(session)}
                          disabled={!session.students || session.students.length === 0}
                          className="px-2 mt-1"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{totalStudents}</p>
                        <p className="text-xs text-gray-500">Total Students</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{presentStudents}</p>
                        <p className="text-xs text-gray-500">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600">{absentStudents}</p>
                        <p className="text-xs text-gray-500">Absent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">{attendanceRate}%</p>
                        <p className="text-xs text-gray-500">Attendance</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Attendance Rate</span>
                        <span>{attendanceRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            parseFloat(attendanceRate) >= 80 ? 'bg-green-600' :
                            parseFloat(attendanceRate) >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(parseFloat(attendanceRate), 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Confidence */}
                    {avgConfidence > 0 && (
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          Avg Confidence: <span className="font-medium">{(avgConfidence * 100).toFixed(1)}%</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => {
                const cls = classes.find((c) => c.id === session.classId);
                const sessionDate = session.date ? new Date(session.date) : undefined;
                const totalStudents = session.students?.length || 0;
                const presentStudents = session.students?.filter(st => st.recognized).length || 0;
                const absentStudents = totalStudents - presentStudents;
                const attendanceRate = totalStudents > 0 ? ((presentStudents / totalStudents) * 100).toFixed(1) : "0.0";
                
                const recognizedStudents = session.students?.filter(st => st.recognized) || [];
                const avgConfidence = recognizedStudents.length > 0 
                  ? recognizedStudents.reduce((sum, st) => sum + (st.confidence || 0), 0) / recognizedStudents.length 
                  : 0;

                return (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{cls?.name || "Unknown"}</div>
                        <div className="text-sm text-gray-500">{cls?.code || "N/A"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sessionDate ? format(sessionDate, "MMM dd, yyyy") : "N/A"}
                      {sessionDate && (
                        <div className="text-xs text-gray-500">
                          {format(sessionDate, "HH:mm")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {totalStudents}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {presentStudents}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {absentStudents}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              parseFloat(attendanceRate) >= 80 ? 'bg-green-600' :
                              parseFloat(attendanceRate) >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(parseFloat(attendanceRate), 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{attendanceRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {avgConfidence > 0 ? `${(avgConfidence * 100).toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        session.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status === 'completed' ? 'Completed' :
                         session.status === 'processing' ? 'Processing' :
                         session.status === 'failed' ? 'Failed' :
                         'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => exportSessionToCSV(session)}
                        disabled={!session.students || session.students.length === 0}
                        className="flex items-center space-x-1"
                        title="Download student details for this session"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden lg:inline">Students CSV</span>
                        <span className="lg:hidden">CSV</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}