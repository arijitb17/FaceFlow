import { useQuery } from "@tanstack/react-query";
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

export default function Dashboard() {
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: classes } = useQuery({
    queryKey: ["/api/classes"],
  });

  const { data: sessions } = useQuery({
    queryKey: ["/api/attendance-sessions"],
  });

  const handleBatchComplete = async (images: string[]) => {
    try {
      // Create a new session
      const sessionResponse = await fetch("/api/attendance-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: "class-1" }) // Default to first class for demo
      });
      
      const session = await sessionResponse.json();

      // Process the batch
      const response = await fetch("/api/face-recognition/process-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          images
        })
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
        <Sidebar />
        <div className="flex-1">
          <Header title="Dashboard" subtitle="Loading..." />
          <div className="p-6">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const todayClasses = classes?.slice(0, 2) || [];
  const recentSessions = sessions?.slice(0, 3) || [];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Dashboard" 
          subtitle="Monitor attendance and manage your classes"
          showStartAttendance
          onStartAttendance={() => {}}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          {stats && (
            <div className="mb-8">
              <StatsCards stats={stats} />
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Attendance Section */}
            <div className="lg:col-span-2">
              <WebcamCapture onBatchComplete={handleBatchComplete} />
            </div>

            {/* Right Sidebar Content */}
            <div className="space-y-6">
              {/* Today's Classes */}
              <Card className="shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900" data-testid="todays-classes-title">
                    Today's Classes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {todayClasses.map((cls: any, index: number) => (
                    <div 
                      key={cls.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      data-testid={`class-item-${index}`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{cls.name}</p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {cls.schedule || "No schedule set"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" data-testid={`class-status-${index}`}>
                          {index === 0 ? "28/30" : "Upcoming"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {todayClasses.length === 0 && (
                    <div className="text-center text-gray-500 py-4" data-testid="no-classes-message">
                      No classes scheduled for today
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Recognition Results */}
              <Card className="shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900" data-testid="recent-recognition-title">
                    Recent Recognition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentSessions.map((session: any, index: number) => (
                    <div 
                      key={session.id}
                      className="flex items-center space-x-3 mb-4 last:mb-0"
                      data-testid={`recognition-item-${index}`}
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="text-gray-600 h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Session {session.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">
                          Confidence: {((session.averageConfidence || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">
                          {new Date(session.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {recentSessions.length === 0 && (
                    <div className="text-center text-gray-500 py-4" data-testid="no-recognition-message">
                      No recent recognition results
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Reports Table */}
          <Card className="mt-8 shadow-sm border border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900" data-testid="reports-table-title">
                  Attendance Reports
                </CardTitle>
                <Button variant="ghost" className="text-primary hover:text-primary/80" data-testid="button-view-all-reports">
                  View All
                </Button>
              </div>
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
                        Present
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accuracy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentSessions.slice(0, 3).map((session: any, index: number) => (
                      <tr key={session.id} className="hover:bg-gray-50" data-testid={`report-row-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {classes?.find((c: any) => c.id === session.classId)?.name || "Unknown Class"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(session.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.totalStudentsRecognized || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.max(0, 30 - (session.totalStudentsRecognized || 0))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="secondary">
                            {((session.averageConfidence || 0) * 100).toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 mr-3" data-testid={`button-view-report-${index}`}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800" data-testid={`button-export-report-${index}`}>
                            Export
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {recentSessions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500" data-testid="no-reports-message">
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
