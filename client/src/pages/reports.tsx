"use client";

import { useState } from "react";
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
import { Download, Search, Calendar as CalendarIcon, BarChart3, Users, TrendingUp, FileText, Filter } from "lucide-react";
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
    const csvData = filteredSessions.flatMap((session) => {
      const cls = classes.find((c) => c.id === session.classId);
      return session.students?.map((st) => ({
        Class: cls?.name || "Unknown",
        Code: cls?.code || "N/A",
        Date: session.date ? format(new Date(session.date), "yyyy-MM-dd") : "N/A",
        "Student ID": st.studentId,
        Name: st.name,
        Recognized: st.recognized ? "Yes" : "No",
        Confidence: st.confidence ? `${(st.confidence * 100).toFixed(1)}%` : "N/A",
        Status: session.status || "Unknown",
      })) ?? [];
    });
    if (!csvData.length) return;

    const csv = [Object.keys(csvData[0]).join(","), ...csvData.map((row) => Object.values(row).map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
        <Header title="Reports" subtitle="View and export attendance analytics" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Sessions" value={totalSessions} icon={<BarChart3 />} color="blue" />
            <StatCard title="Avg Attendance" value={averageAttendance} icon={<Users />} color="green" />
            <StatCard title="Total Students Recognized" value={totalStudentsRecognized} icon={<TrendingUp />} color="purple" />
            <StatCard title="Avg Accuracy" value={`${(averageAccuracy * 100).toFixed(1)}%`} icon={<FileText />} color="orange" />
          </div>

          {/* Filters */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SearchFilter value={searchQuery} onChange={setSearchQuery} />
                <ClassFilter classes={classes} selectedClass={selectedClass} setSelectedClass={setSelectedClass} />
                <DateFilter date={selectedDate} setDate={setSelectedDate} />
                <Button onClick={exportToCSV} disabled={!filteredSessions.length} className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <ReportsTable sessions={filteredSessions} classes={classes} />
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
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function SearchFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor="search">Search</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input id="search" placeholder="Search..." value={value} onChange={(e) => onChange(e.target.value)} className="pl-10" />
      </div>
    </div>
  );
}

function ClassFilter({ classes, selectedClass, setSelectedClass }: { classes: Class[]; selectedClass: string; setSelectedClass: (v: string) => void }) {
  return (
    <div>
      <Label>Class</Label>
      <Select value={selectedClass} onValueChange={setSelectedClass}>
        <SelectTrigger>
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
      <Label>Date</Label>
      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "LLL dd, yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar initialFocus mode="single" defaultMonth={date} selected={date} onSelect={setDate} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ReportsTable({ sessions, classes }: { sessions: AttendanceSession[]; classes: Class[] }) {
  if (!sessions.length) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
        <p className="text-gray-600">No attendance sessions match your current filters</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle>Attendance Reports ({sessions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recognized</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.flatMap((session) => {
                const cls = classes.find((c) => c.id === session.classId);
                const sessionDate = session.date ? new Date(session.date) : undefined;
                return (session.students ?? []).map((st) => (
                  <tr key={`${session.id}-${st.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{cls?.name || "Unknown"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sessionDate ? format(sessionDate, "MMM dd, yyyy") : "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{st.studentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{st.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{st.recognized ? "Yes" : "No"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{st.confidence ? `${(st.confidence * 100).toFixed(1)}%` : "N/A"}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
