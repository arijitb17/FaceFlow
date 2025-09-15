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
import { User, Clock, ChevronRight, Camera } from "lucide-react";
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
  const [showWebcam, setShowWebcam] = useState(false);

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
      setShowWebcam(false); // Hide webcam on mobile after processing
    } catch (err) {
      console.error(err);
    }
  };

  const todayClasses = classes?.filter(c => c.isActive).slice(0, 3) || [];
  const recentSessions = sessions
    ?.filter(s => s.createdAt || s.date)
    ?.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || 0).getTime();
      return timeB - timeA;
    })
    ?.slice(0, 4) || [];

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          title="Dashboard"
          subtitle="Monitor attendance and manage your classes"
          onStartAttendance={() => setShowWebcam(!showWebcam)}
          onMenuClick={() => setIsSidebarOpen(true)}
          userName={userName}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 ">
          {/* Stats Cards */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            {userRole ? (
              <StatsCards
                userRole={userRole}
                userId={userRole === "teacher" ? userId ?? undefined : undefined}
              />
            ) : (
              <div className="animate-pulse grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 h-20 sm:h-32 rounded-xl"></div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Layout */}
          <div className="block lg:hidden space-y-4">
            {/* Mobile Webcam Toggle */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
                  <Button 
                    onClick={() => setShowWebcam(!showWebcam)}
                    className="bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {showWebcam ? "Hide Camera" : "Start Attendance"}
                  </Button>
                </div>
              </CardHeader>
              {showWebcam && (
                <CardContent>
                  <WebcamCapture onBatchComplete={handleBatchComplete} />
                </CardContent>
              )}
            </Card>

            {/* Today's Classes - Mobile */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">Today's Classes</CardTitle>
              </CardHeader>
              <CardContent>
                {classesLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="bg-gray-200 h-16 rounded-lg"></div>
                    ))}
                  </div>
                ) : classesError ? (
                  <div className="text-red-500 text-sm">Failed to load classes</div>
                ) : todayClasses.length > 0 ? (
                  <div className="space-y-3">
                    {todayClasses.map((cls, idx) => (
                      <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm truncate">{cls.name}</p>
                          <p className="text-xs text-gray-600 flex items-center mt-1">
                            <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                            {cls.schedule || "No schedule set"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Badge variant={idx === 0 ? "default" : "secondary"} className="text-xs">
                            {idx === 0 ? "Active" : "Upcoming"}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8 text-sm">No active classes</div>
                )}
              </CardContent>
            </Card>

            {/* Recent Sessions - Mobile */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-gray-200 h-14 rounded-lg"></div>
                    ))}
                  </div>
                ) : sessionsError ? (
                  <div className="text-red-500 text-sm">Failed to load sessions</div>
                ) : recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.map(session => {
                      const classData = classes.find(c => c.id === session.classId);
                      const sessionTime = session.createdAt || session.date;
                      return (
                        <div key={session.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="text-gray-600 h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {classData?.name || `Session ${session.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-gray-600">
                              {session.totalStudentsRecognized || 0} students • {((session.averageConfidence || 0) * 100).toFixed(1)}% confidence
                            </p>
                          </div>
                          <div className="text-right text-xs text-gray-500 flex-shrink-0">
                            {sessionTime ? new Date(sessionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8 text-sm">No recent sessions</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <WebcamCapture onBatchComplete={handleBatchComplete} />
            </div>

            <div className="space-y-4 lg:space-y-6">
              {/* Today's Classes - Desktop */}
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

              {/* Recent Recognition - Desktop */}
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
                            {session.totalStudentsRecognized || 0} students • {((session.averageConfidence || 0) * 100).toFixed(1)}% confidence
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