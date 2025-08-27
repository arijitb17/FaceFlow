import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, CheckCircle, XCircle } from "lucide-react";
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
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  isActive: boolean;
}

export default function StudentDashboard() {
  const studentId = localStorage.getItem("userId");

  // ✅ Use /api/auth/me for profile (works already)
  const { data: student } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
  });

  // Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  // Fetch attendance records for this student
  const { data: attendanceRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance", studentId],
  });

  // Compute stats
  const totalSessions = attendanceRecords.length;
  const attended = attendanceRecords.filter((r) => r.isPresent).length;
  const attendancePercentage =
    totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

  const recentAttendance = attendanceRecords.slice(0, 5);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">
              Student Dashboard
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Welcome back, {student?.name || "Student"}
            </p>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="text-gray-600 h-3 w-3" />
              </div>
              <div>
                <span className="text-sm text-gray-700 font-medium">
                  {student?.name}
                </span>
                <p className="text-xs text-gray-500">ID: {student?.id}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6 max-w-6xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

        {/* Recent Attendance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length > 0 ? (
              <div className="space-y-3">
                {recentAttendance.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded"
                  >
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
              <p className="text-gray-500 text-center py-6">
                No attendance records yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Current Classes */}
        <Card>
          <CardHeader>
            <CardTitle>Current Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length > 0 ? (
              <div className="space-y-3">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="text-primary h-5 w-5" />
                      <div>
                        <p className="font-medium">{cls.name}</p>
                        <p className="text-sm text-gray-600">
                          {cls.schedule || "Schedule TBA"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                No classes enrolled
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
