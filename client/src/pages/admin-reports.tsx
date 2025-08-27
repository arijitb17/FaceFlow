import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, dateFnsLocalizer, Event as RBCEvent } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { BarChart3, Calendar as CalendarIcon, Users, Clock, Download } from "lucide-react";
import Sidebar from "@/components/admin/sidebar";

// DateFns locales for calendar
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// Types
interface Class {
  id: string;
  name: string;
  code: string;
  teacher: { user: { name: string } };
}

interface AttendanceSession {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
  class: { name: string; code: string };
  teacher: { user: { name: string } };
}

interface Student {
  id: string;
  user: { name: string };
}

export default function AdminReports() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("week");

  // ✅ Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  // ✅ Fetch all sessions (filter later by class if needed)
  const { data: allSessions = [] } = useQuery<AttendanceSession[]>({
    queryKey: ["/api/sessions"],
  });

  // ✅ Fetch students to calculate total students
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // ✅ Derived sessions for selected class
const sessions = useMemo(() => {
  if (!selectedClass) return allSessions;
  return allSessions.filter((s) => s.class?.code === selectedClass);
}, [allSessions, selectedClass]);


  // ✅ Map sessions to calendar events
  const calendarEvents: RBCEvent[] = sessions.map((session) => ({
    id: session.id,
    title: `${session.class.name} (${session.class.code})`,
    start: new Date(session.startTime),
    end: new Date(session.endTime || session.startTime),
    resource: session,
  }));

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-slate-600" />
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Attendance Reports</h1>
                <p className="text-slate-600">Analytics and attendance tracking reports</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                </SelectContent>
              </Select>

              {/* ✅ Class selector */}
              <Select>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>

                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.code} value={cls.code}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>


              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Students</p>
                    <p className="text-2xl font-bold text-slate-900">{students.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Classes Today</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {
                        sessions.filter(
                          (s) =>
                            new Date(s.sessionDate).toDateString() ===
                            new Date().toDateString()
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Average Attendance</p>
                    {/* ⚠️ Placeholder until you calculate from session data */}
                    <p className="text-2xl font-bold text-slate-900">87%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Recognition Accuracy</p>
                    {/* ⚠️ Placeholder until backend provides accuracy */}
                    <p className="text-2xl font-bold text-slate-900">94%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Class Schedule Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              {calendarEvents.length > 0 ? (
                <div style={{ height: 500 }}>
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    views={["month", "week", "day"]}
                    defaultView="week"
                    eventPropGetter={() => ({
                      style: {
                        backgroundColor: "#3b82f6",
                        borderRadius: "5px",
                        opacity: 0.8,
                        color: "white",
                        border: "0px",
                        display: "block",
                      },
                    })}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No sessions scheduled
                  </h3>
                  <p className="text-slate-500">
                    Schedule some attendance sessions to see them here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
