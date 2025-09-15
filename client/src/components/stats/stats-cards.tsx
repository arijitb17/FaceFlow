import React from "react";
import { Users, TrendingUp, GraduationCap, Brain, Activity, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Helper functions for safe number formatting
const safeNumber = (value: number, defaultValue = 0): number => {
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return value;
};

const formatPercentage = (value: number): string => {
  const safe = safeNumber(value * 100, 0);
  return `${Math.max(0, Math.min(100, safe)).toFixed(1)}%`;
};

const formatInteger = (value: number): string => {
  const safe = safeNumber(value, 0);
  return Math.max(0, Math.floor(safe)).toString();
};

// Admin stats interface
interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeClasses: number;
  todayAttendance: number; // 0.85 for 85%
  accuracy: number; // 0.95 for 95%
  systemHealth: number; // 0.998 for 99.8%
  todayClassesCount: number;
  totalSessions: number;
  completedSessions: number;
}

// Teacher stats interface
interface TeacherStats {
  totalStudents: number;
  todayAttendance: number; // 0.85 for 85%
  activeClasses: number;
  accuracy: number; // 0.95 for 95%
  totalSessions: number;
  todayClassesCount: number;
  completedSessions: number;
}

// Props for the StatsCards component
interface StatsCardsProps {
  userRole: "admin" | "teacher";
  userId?: string; // Required for teacher
  prevStats?: Partial<AdminStats | TeacherStats>; // optional, for calculating changes
}

// Individual card configuration
interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: any;
  bgColor: string;
  iconColor: string;
  borderColor: string;
  testId: string;
}

export default function StatsCards({ userRole, userId, prevStats }: StatsCardsProps) {
  const [stats, setStats] = React.useState<AdminStats | TeacherStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadStats();
  }, [userRole, userId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = "";
      if (userRole === "admin") {
        // For admin, we can use any userId (it's not used in admin stats)
        endpoint = `/api/dashboard/stats?userId=admin&role=admin`;
      } else if (userRole === "teacher" && userId) {
        endpoint = `/api/dashboard/stats?userId=${userId}&role=teacher`;
      } else {
        throw new Error("Invalid configuration: Teacher role requires userId");
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
      setError(error instanceof Error ? error.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = (current: number, previous?: number): string => {
    const safeCurrent = safeNumber(current, 0);
    
    if (previous === undefined) {
      return "No previous data";
    }
    
    const safePrevious = safeNumber(previous, 0);

    if (safePrevious === 0) {
      return "No previous data";
    }

    const diff = safeCurrent - safePrevious;
    const percent = Math.abs((diff / safePrevious) * 100);

    if (percent < 0.1) {
      return "No change";
    }

    return diff >= 0 
      ? `↗ +${percent.toFixed(1)}%` 
      : `↘ -${percent.toFixed(1)}%`;
  };

  const getChangeColor = (change: string): string => {
    if (change.includes("↗")) return "text-green-600";
    if (change.includes("↘")) return "text-red-500";
    return "text-gray-500";
  };

  // Generate cards based on user role
  const generateCards = (): StatCard[] => {
    if (!stats) return [];

    if (userRole === "admin") {
      const adminStats = stats as AdminStats;
      const safeStats = {
        totalStudents: safeNumber(adminStats.totalStudents, 0),
        totalTeachers: safeNumber(adminStats.totalTeachers, 0),
        activeClasses: safeNumber(adminStats.activeClasses, 0),
        systemHealth: safeNumber(adminStats.systemHealth, 0),
      };

      return [
        {
          title: "Total Teachers",
          value: formatInteger(safeStats.totalTeachers),
          change: calculateChange(safeStats.totalTeachers, (prevStats as AdminStats)?.totalTeachers),
          icon: Users,
          bgColor: "bg-blue-50",
          iconColor: "text-blue-600",
          borderColor: "border-blue-200",
          testId: "stat-total-teachers"
        },
        {
          title: "Total Students",
          value: formatInteger(safeStats.totalStudents),
          change: calculateChange(safeStats.totalStudents, (prevStats as AdminStats)?.totalStudents),
          icon: GraduationCap,
          bgColor: "bg-green-50",
          iconColor: "text-green-600",
          borderColor: "border-green-200",
          testId: "stat-total-students"
        },
        {
          title: "Active Classes",
          value: formatInteger(safeStats.activeClasses),
          change: calculateChange(safeStats.activeClasses, (prevStats as AdminStats)?.activeClasses),
          icon: BookOpen,
          bgColor: "bg-purple-50",
          iconColor: "text-purple-600",
          borderColor: "border-purple-200",
          testId: "stat-active-classes"
        },
        {
          title: "System Health",
          value: formatPercentage(safeStats.systemHealth),
          change: "Excellent",
          icon: Activity,
          bgColor: "bg-orange-50",
          iconColor: "text-orange-600",
          borderColor: "border-orange-200",
          testId: "stat-system-health"
        },
      ];
    } else {
      // Teacher cards
      const teacherStats = stats as TeacherStats;
      const safeStats = {
        totalStudents: safeNumber(teacherStats.totalStudents, 0),
        todayAttendance: safeNumber(teacherStats.todayAttendance, 0),
        activeClasses: safeNumber(teacherStats.activeClasses, 0),
        accuracy: safeNumber(teacherStats.accuracy, 0)
      };

      return [
        {
          title: "Total Students",
          value: formatInteger(safeStats.totalStudents),
          change: calculateChange(safeStats.totalStudents, (prevStats as TeacherStats)?.totalStudents),
          icon: Users,
          bgColor: "bg-blue-50",
          iconColor: "text-blue-600",
          borderColor: "border-blue-200",
          testId: "stat-total-students"
        },
        {
          title: "Today's Attendance",
          value: formatPercentage(safeStats.todayAttendance),
          change: calculateChange(
            safeStats.todayAttendance * 100, 
            (prevStats as TeacherStats)?.todayAttendance !== undefined ? safeNumber((prevStats as TeacherStats).todayAttendance!, 0) * 100 : undefined
          ),
          icon: TrendingUp,
          bgColor: "bg-green-50",
          iconColor: "text-green-600",
          borderColor: "border-green-200",
          testId: "stat-today-attendance"
        },
        {
          title: "Active Classes",
          value: formatInteger(safeStats.activeClasses),
          change: calculateChange(safeStats.activeClasses, (prevStats as TeacherStats)?.activeClasses),
          icon: GraduationCap,
          bgColor: "bg-purple-50",
          iconColor: "text-purple-600",
          borderColor: "border-purple-200",
          testId: "stat-active-classes"
        },
        {
          title: "Recognition Accuracy",
          value: formatPercentage(safeStats.accuracy),
          change: calculateChange(
            safeStats.accuracy * 100,
            (prevStats as TeacherStats)?.accuracy !== undefined ? safeNumber((prevStats as TeacherStats).accuracy!, 0) * 100 : undefined
          ),
          icon: Brain,
          bgColor: "bg-orange-50",
          iconColor: "text-orange-600",
          borderColor: "border-orange-200",
          testId: "stat-accuracy"
        },
      ];
    }
  };

  const cards = generateCards();

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((index) => (
          <Card key={index} className="shadow-sm border-2 animate-pulse">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="h-3 md:h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 md:h-8 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="h-3 md:h-4 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Card className="col-span-2 md:col-span-4 shadow-sm border-2 border-red-200">
          <CardContent className="p-4 md:p-6 text-center">
            <p className="text-red-600 font-medium">Error loading stats</p>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
            <button 
              onClick={loadStats}
              className="mt-3 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {cards.map((card: StatCard) => {
        const IconComponent = card.icon;
        const changeColor: string = getChangeColor(card.change);

        return (
          <Card 
            key={card.testId} 
            className={`shadow-sm border-2 ${card.borderColor} hover:shadow-md transition-shadow`} 
            data-testid={card.testId}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-gray-600 text-xs md:text-sm font-medium mb-1">
                    {card.title}
                  </p>
                  <p 
                    className="text-xl md:text-3xl font-bold text-gray-900" 
                    data-testid={`${card.testId}-value`}
                  >
                    {card.value}
                  </p>
                </div>
                <div className={`w-10 h-10 md:w-14 md:h-14 ${card.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`${card.iconColor} w-5 h-5 md:w-7 md:h-7`} />
                </div>
              </div>
              <div className="flex items-center">
                <span 
                  className={`text-xs md:text-sm font-medium ${changeColor}`}
                  data-testid={`${card.testId}-change`}
                >
                  {card.change}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export type { AdminStats, TeacherStats, StatsCardsProps, StatCard };