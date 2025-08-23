import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import type { AttendanceSession, Class } from "@shared/schema";

export default function StudentDashboard() {
  const studentId = localStorage.getItem("userId");

  const { data: student } = useQuery({
    queryKey: [`/api/students/${studentId}`],
  });

  const { data: sessions } = useQuery({
    queryKey: ["/api/attendance-sessions"],
  });

  const { data: classes } = useQuery({
    queryKey: ["/api/classes"],
  });

  // Filter sessions for the student (simplified)
  const studentSessions = sessions?.slice(0, 10) || [];
  const attendancePercentage = studentSessions.length > 0 ? 85 : 0; // Mock calculation

  const recentAttendance = studentSessions.slice(0, 5).map((session: AttendanceSession) => {
    const cls = classes?.find((c: Class) => c.id === session.classId);
    return {
      ...session,
      className: cls?.name || "Unknown Class",
      classCode: cls?.code || "",
      isPresent: Math.random() > 0.2 // Mock presence
    };
  });

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="student-dashboard-title">
              Student Dashboard
            </h1>
            <p className="text-gray-600" data-testid="student-welcome">
              Welcome back, {student?.name || "Student"}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="text-gray-600 h-4 w-4" />
              </div>
              <div>
                <span className="text-gray-700 font-medium" data-testid="student-name">
                  {student?.name}
                </span>
                <p className="text-sm text-gray-500" data-testid="student-id">
                  ID: {student?.studentId}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Attendance Rate</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="attendance-rate">
                    {attendancePercentage}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-secondary text-sm font-medium">
                  ↗ Above average
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Classes Enrolled</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="enrolled-classes">
                    {classes?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="text-secondary text-xl" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-gray-600 text-sm">
                  Active semester
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Sessions</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="total-sessions">
                    {studentSessions.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Clock className="text-accent text-xl" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-gray-600 text-sm">
                  This semester
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Attendance */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle data-testid="recent-attendance-title">Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAttendance.map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    data-testid={`attendance-record-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.isPresent ? "bg-secondary/10" : "bg-destructive/10"
                      }`}>
                        {record.isPresent ? (
                          <CheckCircle className="text-secondary h-5 w-5" />
                        ) : (
                          <XCircle className="text-destructive h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900" data-testid={`class-name-${index}`}>
                          {record.className}
                        </p>
                        <p className="text-sm text-gray-600" data-testid={`class-code-${index}`}>
                          {record.classCode}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={record.isPresent ? "default" : "destructive"}
                        className={record.isPresent ? "bg-secondary text-white" : ""}
                        data-testid={`attendance-status-${index}`}
                      >
                        {record.isPresent ? "Present" : "Absent"}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1" data-testid={`attendance-date-${index}`}>
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentAttendance.length === 0 && (
                  <div className="text-center py-8 text-gray-500" data-testid="no-attendance-records">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p>No attendance records yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Classes */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle data-testid="current-classes-title">Current Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {classes?.map((cls: Class, index: number) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    data-testid={`class-item-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900" data-testid={`current-class-name-${index}`}>
                          {cls.name}
                        </p>
                        <p className="text-sm text-gray-600" data-testid={`current-class-schedule-${index}`}>
                          {cls.schedule || "Schedule TBA"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" data-testid={`class-attendance-${index}`}>
                        85% Attendance
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!classes || classes.length === 0) && (
                  <div className="text-center py-8 text-gray-500" data-testid="no-classes-enrolled">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p>No classes enrolled</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Calendar */}
        <Card className="mt-6 shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle data-testid="attendance-calendar-title">This Month's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              <div className="font-semibold text-gray-600 p-2">Sun</div>
              <div className="font-semibold text-gray-600 p-2">Mon</div>
              <div className="font-semibold text-gray-600 p-2">Tue</div>
              <div className="font-semibold text-gray-600 p-2">Wed</div>
              <div className="font-semibold text-gray-600 p-2">Thu</div>
              <div className="font-semibold text-gray-600 p-2">Fri</div>
              <div className="font-semibold text-gray-600 p-2">Sat</div>
              
              {/* Mock calendar days */}
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 5; // Start from previous month's end
                const isCurrentMonth = day > 0 && day <= 31;
                const hasClass = isCurrentMonth && Math.random() > 0.7;
                const isPresent = hasClass && Math.random() > 0.15;
                
                return (
                  <div
                    key={i}
                    className={`p-2 rounded ${
                      !isCurrentMonth 
                        ? "text-gray-300" 
                        : hasClass 
                          ? isPresent 
                            ? "bg-secondary/20 text-secondary border border-secondary" 
                            : "bg-destructive/20 text-destructive border border-destructive"
                          : "text-gray-600"
                    }`}
                    data-testid={`calendar-day-${i}`}
                  >
                    {day > 0 ? day : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-secondary/20 border border-secondary rounded"></div>
                <span>Present</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-destructive/20 border border-destructive rounded"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span>No Class</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}