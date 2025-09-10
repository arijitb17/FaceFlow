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
import { User, Clock } from "lucide-react";
import { useState, useEffect } from "react";

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
  const [userName, setUserName] = useState("Guest");
  const [userRole, setUserRole] = useState<"admin" | "teacher" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);

  // Fetch logged-in user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (!res.ok) throw new Error("Failed to fetch user");
        const user = await res.json();

        setUserName(user.name || "Guest");
        setUserRole(user.role || null);
        setUserId(user.id || null);
      } catch (err) {
        console.error(err);
        setUserName("Guest");
        setUserRole(null);
        setUserId(null);
      }
    }
    fetchUser();
  }, []);

  // Fetch classes
  const { data: classes = [], isLoading: classesLoading, isError: classesError } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
  });

  // Fetch sessions
  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError } = useQuery<Session[]>({
    queryKey: ["/api/attendance-sessions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/attendance-sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  // Batch processing
  const handleBatchComplete = async (images: string[]) => {
    try {
      const sessionData = { classId: classes.length > 0 ? classes[0].id : null };
      const sessionRes = await apiRequest("POST", "/api/attendance-sessions", sessionData);
      if (!sessionRes.ok) throw new Error("Failed to create session");
      const session = await sessionRes.json();

      const processRes = await apiRequest("POST", "/api/face-recognition/process-batch", { sessionId: session.id, images });
      if (!processRes.ok) throw new Error("Batch processing failed");
      const results = await processRes.json();

      setBatchResults(results.results);
      setShowProcessingModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const todayClasses = classes?.filter(c => c.isActive).slice(0, 2) || [];
  const recentSessions = sessions
    ?.filter(s => s.createdAt || s.date)
    ?.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || 0).getTime();
      return timeB - timeA;
    })
    ?.slice(0, 3) || [];

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          title="Dashboard"
          subtitle="Monitor attendance and manage your classes"
          onStartAttendance={() => {}}
          onMenuClick={() => setIsSidebarOpen(true)}
          userName={userName}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="mb-6 lg:mb-8">
            {userRole ? (
              <StatsCards
                userRole={userRole}
                userId={userRole === "teacher" ? userId ?? undefined : undefined}
              />
            ) : (
              <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <WebcamCapture onBatchComplete={handleBatchComplete} />
            </div>

            <div className="space-y-4 lg:space-y-6">
              {/* Today's Classes */}
              <Card className="shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Today's Classes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {classesLoading ? (
                    <div>Loading classes...</div>
                  ) : classesError ? (
                    <div className="text-red-500">Failed to load classes</div>
                  ) : todayClasses.length > 0 ? todayClasses.map((cls, idx) => (
                    <div key={cls.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{cls.name}</p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {cls.schedule || "No schedule set"}
                        </p>
                      </div>
                      <Badge variant="secondary">{idx === 0 ? "Active" : "Upcoming"}</Badge>
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
                  {sessionsLoading ? (
                    <div>Loading sessions...</div>
                  ) : sessionsError ? (
                    <div className="text-red-500">Failed to load sessions</div>
                  ) : recentSessions.length > 0 ? recentSessions.map(session => {
                    const classData = classes.find(c => c.id === session.classId);
                    const sessionTime = session.createdAt || session.date;
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
                          {sessionTime ? new Date(sessionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
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