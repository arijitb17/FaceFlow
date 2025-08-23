import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import type { AttendanceSession, Class } from "@shared/schema";

export default function Reports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/attendance-sessions"],
  });

  const { data: classes } = useQuery({
    queryKey: ["/api/classes"],
  });

  const { data: students } = useQuery({
    queryKey: ["/api/students"],
  });

  const filteredSessions = sessions?.filter((session: AttendanceSession) => {
    if (selectedClass !== "all" && session.classId !== selectedClass) {
      return false;
    }

    if (dateRange.from && new Date(session.date) < dateRange.from) {
      return false;
    }

    if (dateRange.to && new Date(session.date) > dateRange.to) {
      return false;
    }

    return true;
  }) || [];

  const exportToCSV = () => {
    const csvData = filteredSessions.map((session: AttendanceSession) => {
      const cls = classes?.find((c: Class) => c.id === session.classId);
      return {
        Class: cls?.name || "Unknown",
        Date: format(new Date(session.date), "yyyy-MM-dd"),
        "Total Images": session.totalImages,
        "Faces Detected": session.totalFacesDetected,
        "Students Recognized": session.totalStudentsRecognized,
        "Average Confidence": `${((session.averageConfidence || 0) * 100).toFixed(1)}%`,
        Status: session.status
      };
    });

    const csv = [
      Object.keys(csvData[0] || {}).join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary stats
  const totalSessions = filteredSessions.length;
  const totalStudentsRecognized = filteredSessions.reduce((sum: number, session: AttendanceSession) => 
    sum + (session.totalStudentsRecognized || 0), 0);
  const averageAttendance = totalSessions > 0 ? Math.round(totalStudentsRecognized / totalSessions) : 0;
  const averageAccuracy = totalSessions > 0 
    ? filteredSessions.reduce((sum: number, session: AttendanceSession) => 
        sum + (session.averageConfidence || 0), 0) / totalSessions 
    : 0;

  if (sessionsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1">
          <Header title="Reports" subtitle="Loading..." />
          <div className="p-6">
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
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Reports" 
          subtitle="View and export attendance analytics"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Sessions</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="total-sessions">
                      {totalSessions}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="text-primary text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Avg Attendance</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="avg-attendance">
                      {averageAttendance}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <Users className="text-secondary text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="total-students-recognized">
                      {totalStudentsRecognized}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-accent text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Avg Accuracy</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="avg-accuracy">
                      {(averageAccuracy * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <FileText className="text-destructive text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" data-testid="filters-title">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="search"
                      placeholder="Search sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-reports"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="class">Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger data-testid="select-class-filter">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes?.map((cls: Class) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                        data-testid="button-date-range"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={exportToCSV}
                    disabled={filteredSessions.length === 0}
                    className="w-full bg-secondary text-white hover:bg-secondary/90"
                    data-testid="button-export-csv"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle data-testid="reports-table-title">
                Attendance Reports ({filteredSessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="reports-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Images
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Faces
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accuracy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSessions.map((session: AttendanceSession, index: number) => {
                      const cls = classes?.find((c: Class) => c.id === session.classId);
                      return (
                        <tr key={session.id} className="hover:bg-gray-50" data-testid={`report-row-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900" data-testid={`report-class-${index}`}>
                              {cls?.name || "Unknown Class"}
                            </div>
                            <div className="text-sm text-gray-500">{cls?.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid={`report-date-${index}`}>
                            {format(new Date(session.date), "MMM dd, yyyy")}
                            <div className="text-xs text-gray-400">
                              {format(new Date(session.date), "h:mm a")}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`report-images-${index}`}>
                            {session.totalImages || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`report-faces-${index}`}>
                            {session.totalFacesDetected || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`report-students-${index}`}>
                            {session.totalStudentsRecognized || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" data-testid={`report-accuracy-${index}`}>
                            <Badge 
                              variant="secondary"
                              className={cn(
                                (session.averageConfidence || 0) >= 0.9 ? "bg-secondary/10 text-secondary" :
                                (session.averageConfidence || 0) >= 0.8 ? "bg-accent/10 text-accent" :
                                "bg-destructive/10 text-destructive"
                              )}
                            >
                              {((session.averageConfidence || 0) * 100).toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" data-testid={`report-status-${index}`}>
                            <Badge 
                              variant={session.status === "completed" ? "default" : "secondary"}
                              className={cn(
                                session.status === "completed" ? "bg-secondary text-white" :
                                session.status === "failed" ? "bg-destructive text-white" :
                                "bg-accent text-white"
                              )}
                            >
                              {session.status?.charAt(0).toUpperCase() + session.status?.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-primary hover:text-primary/80 mr-3"
                              data-testid={`button-view-session-${index}`}
                            >
                              View
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-gray-600 hover:text-gray-800"
                              data-testid={`button-export-session-${index}`}
                            >
                              Export
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {filteredSessions.length === 0 && (
                  <div className="text-center py-12" data-testid="no-reports-message">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                    <p className="text-gray-600">
                      No attendance sessions match your current filters
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
