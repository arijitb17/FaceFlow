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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Download, 
  Search, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Users, 
  TrendingUp,
  FileText,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type AttendanceSession = {
  id: string;
  classId?: string;
  date?: string;
  totalImages?: number;
  totalFacesDetected?: number;
  totalStudentsRecognized?: number;
  averageConfidence?: number;
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
  dataTestId?: string;
}
export default function Reports() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<AttendanceSession[]>({
    queryKey: ["/api/attendance-sessions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/attendance-sessions");
      return res.json();
    },
    initialData: [],
  });

  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      return res.json();
    },
    initialData: [],
  });

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (selectedClass !== "all" && session.classId !== selectedClass) return false;
    if (dateRange.from && session.date && new Date(session.date) < dateRange.from) return false;
    if (dateRange.to && session.date && new Date(session.date) > dateRange.to) return false;
    if (searchQuery) {
      const cls = classes.find(c => c.id === session.classId);
      const searchLower = searchQuery.toLowerCase();
      if (!cls?.name.toLowerCase().includes(searchLower) && 
          !cls?.code.toLowerCase().includes(searchLower) &&
          !session.id.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  // Export CSV
  const exportToCSV = () => {
    if (!filteredSessions.length) return;
    const csvData = filteredSessions.map(session => {
      const cls = classes.find(c => c.id === session.classId);
      const sessionDate = session.date ? new Date(session.date) : undefined;
      return {
        Class: cls?.name || "Unknown",
        Code: cls?.code || "N/A",
        Date: sessionDate ? format(sessionDate, "yyyy-MM-dd") : "N/A",
        "Total Images": session.totalImages ?? 0,
        "Faces Detected": session.totalFacesDetected ?? 0,
        "Students Recognized": session.totalStudentsRecognized ?? 0,
        "Average Confidence": `${((session.averageConfidence ?? 0) * 100).toFixed(1)}%`,
        Status: session.status ?? "Unknown",
      };
    });

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const totalSessions = filteredSessions.length;
  const totalStudentsRecognized = filteredSessions.reduce((sum, s) => sum + (s.totalStudentsRecognized ?? 0), 0);
  const averageAttendance = totalSessions > 0 ? Math.round(totalStudentsRecognized / totalSessions) : 0;
  const averageAccuracy = totalSessions > 0 ? filteredSessions.reduce((sum, s) => sum + (s.averageConfidence ?? 0), 0) / totalSessions : 0;

  if (sessionsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1">
          <Header title="Reports" subtitle="Loading..." onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="p-4 lg:p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
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
        <Header title="Reports" subtitle="View and export attendance analytics" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Sessions" value={totalSessions} icon={<BarChart3 />} color="blue" dataTestId="total-sessions" />
            <StatCard title="Avg Attendance" value={averageAttendance} icon={<Users />} color="green" dataTestId="avg-attendance" />
            <StatCard title="Total Students" value={totalStudentsRecognized} icon={<TrendingUp />} color="purple" dataTestId="total-students-recognized" />
            <StatCard title="Avg Accuracy" value={`${(averageAccuracy * 100).toFixed(1)}%`} icon={<FileText />} color="orange" dataTestId="avg-accuracy" />
          </div>

          {/* Filters */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" data-testid="filters-title">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SearchFilter value={searchQuery} onChange={setSearchQuery} />
                <ClassFilter classes={classes} selectedClass={selectedClass} setSelectedClass={setSelectedClass} />
                <DateRangeFilter dateRange={dateRange} setDateRange={setDateRange} showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker} />
                <Button 
                  onClick={exportToCSV} 
                  disabled={!filteredSessions.length} 
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  data-testid="button-export-csv"
                >
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

// ---- Helper Components ----
function StatCard({ title, value, icon, color, dataTestId }: StatCardProps) {
  const colorClasses: Record<ColorKey, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">{title}</p>
            <p
              className="text-3xl font-bold text-gray-900"
              data-testid={dataTestId}
            >
              {value}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function SearchFilter({ value, onChange }: any) {
  return (
    <div>
      <Label htmlFor="search">Search</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input id="search" placeholder="Search sessions..." value={value} onChange={(e) => onChange(e.target.value)} className="pl-10" data-testid="input-search-reports" />
      </div>
    </div>
  );
}

function ClassFilter({ classes, selectedClass, setSelectedClass }: any) {
  return (
    <div>
      <Label htmlFor="class">Class</Label>
      <Select value={selectedClass} onValueChange={setSelectedClass}>
        <SelectTrigger data-testid="select-class-filter">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((cls: Class) => (
            <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.code})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateRangeFilter({ dateRange, setDateRange, showDatePicker, setShowDatePicker }: any) {
  return (
    <div>
      <Label>Date Range</Label>
      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
            data-testid="button-date-range"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from ? dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y") : "Pick a date range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ReportsTable({ sessions, classes }: any) {
  if (!sessions.length) {
    return (
      <div className="text-center py-12" data-testid="no-reports-message">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
        <p className="text-gray-600">No attendance sessions match your current filters</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle data-testid="reports-table-title">Attendance Reports ({sessions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="reports-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faces</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session: AttendanceSession, index: number) => {
                const cls = classes.find((c: Class) => c.id === session.classId);
                const sessionDate = session.date ? new Date(session.date) : undefined;
                const status = session.status ?? "Unknown";
                const confidence = session.averageConfidence ?? 0;
                return (
                  <tr key={session.id} className="hover:bg-gray-50" data-testid={`report-row-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cls?.name || "Unknown Class"}</div>
                      <div className="text-sm text-gray-500">{cls?.code || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sessionDate ? format(sessionDate, "MMM dd, yyyy") : "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.totalImages ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.totalFacesDetected ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.totalStudentsRecognized ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          confidence >= 0.9 ? "bg-green-100 text-green-800" : 
                          confidence >= 0.8 ? "bg-yellow-100 text-yellow-800" : 
                          "bg-red-100 text-red-800"
                        )}
                      >
                        {(confidence * 100).toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={status === "completed" ? "default" : "secondary"}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" data-testid={`button-view-session-${index}`}>View</Button>
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800" data-testid={`button-export-session-${index}`}>Export</Button>
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