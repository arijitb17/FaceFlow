"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/stats/stats-cards";
import WebcamCapture from "@/components/attendance/webcam-capture";
import BatchProcessingModal from "@/components/attendance/batch-processing-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Clock } from "lucide-react";
import { useState } from "react";

// Types
type Stats = {
  totalStudents: number;
  todayAttendance: string;
  activeClasses: number;
  accuracy: string;
};

type Class = {
  id: string;
  name: string;
  code: string;
  schedule?: string;
  isActive: boolean;
};

type Session = {
  id: string;
  classId?: string;
  date?: string;
  createdAt?: string;
  totalStudentsRecognized?: number;
  averageConfidence?: number;
  status?: string;
};

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/stats");
      return res.json();
    },
    initialData: { totalStudents: 0, todayAttendance: "0%", activeClasses: 0, accuracy: "0%" },
  });

  // Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      return res.json();
    },
    initialData: [],
  });

  // Fetch sessions
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/attendance-sessions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/attendance-sessions");
      return res.json();
    },
    initialData: [],
  });

  // Batch processing
  const handleBatchComplete = async (images: string[]) => {
    try {
      // Create a session with the first available class
      const sessionData = {
        classId: classes.length > 0 ? classes[0].id : null,
      };

      const sessionResponse = await apiRequest("POST", "/api/attendance-sessions", sessionData);
      const session = await sessionResponse.json();

      const response = await apiRequest("POST", "/api/face-recognition/process-batch", {
        sessionId: session.id,
        images,
      });

      const results = await response.json();
      setBatchResults(results.results);
      setShowProcessingModal(true);
    } catch (error) {
      console.error("Batch processing failed:", error);
    }
  };

  if (statsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1">
          <Header title="Dashboard" subtitle="Loading..." onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="p-4 lg:p-6">
            <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get today's active classes
  const todayClasses = classes?.filter(c => c.isActive).slice(0, 2) || [];
  // Get recent sessions (limit to last 3)
  const recentSessions = sessions?.slice(-3).reverse() || [];

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          title="Dashboard"
          subtitle="Monitor attendance and manage your classes"
          showStartAttendance
          onStartAttendance={() => {}}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="mb-6 lg:mb-8">
            <StatsCards stats={stats!} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Live Attendance */}
            <div className="lg:col-span-2">
              <WebcamCapture onBatchComplete={handleBatchComplete} />
            </div>

            {/* Sidebar Content */}
            <div className="space-y-4 lg:space-y-6">
              {/* Today's Classes */}
              <Card className="shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Today's Classes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {todayClasses.length > 0 ? todayClasses.map((cls, index) => (
                    <div key={cls.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{cls.name}</p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {cls.schedule || "No schedule set"}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {index === 0 ? "Active" : "Upcoming"}
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">No active classes</div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Recognition */}
              <Card className="shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentSessions.length > 0 ? recentSessions.map((session) => {
                    const classData = classes.find(c => c.id === session.classId);
                    return (
                      <div key={session.id} className="flex items-center space-x-3 mb-4 last:mb-0">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="text-gray-600 h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {classData?.name || `Session ${session.id.slice(0, 8)}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {session.totalStudentsRecognized || 0} students • 
                            {((session.averageConfidence || 0) * 100).toFixed(1)}% confidence
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {session.createdAt ? new Date(session.createdAt).toLocaleTimeString() : "—"}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center text-gray-500 py-4">No recent sessions</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Attendance Reports Table */}
          <Card className="mt-6 lg:mt-8 shadow-sm border border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Recent Attendance Reports</CardTitle>
                <Button variant="ghost" className="text-primary hover:text-primary/80">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Accuracy</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentSessions.length > 0 ? recentSessions.map((session) => {
                      const classData = classes.find(c => c.id === session.classId);
                      return (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{classData?.name || "Unknown Class"}</div>
                            <div className="text-sm text-gray-500">{classData?.code || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                            {session.date ? new Date(session.date).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.totalStudentsRecognized || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                            <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                              {(session.status || "pending").charAt(0).toUpperCase() + (session.status || "pending").slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                            {((session.averageConfidence || 0) * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm">View</Button>
                              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Export</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No attendance reports available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <BatchProcessingModal
        isOpen={showProcessingModal}
        onClose={() => setShowProcessingModal(false)}
        results={batchResults}
      />
    </div>
  );
}