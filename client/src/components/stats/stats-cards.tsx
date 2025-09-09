import { Users, TrendingUp, GraduationCap, Brain, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { 
  User, 
  Student, 
  Teacher, 
  Class, 
  AttendanceSession, 
  AttendanceRecord, 
  RecognitionResult 
} from "@shared/schema";

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

// Main stats interface
interface Stats {
  totalStudents: number;
  todayAttendance: number; // 0.85 for 85%
  activeClasses: number;
  accuracy: number; // 0.95 for 95%
}

// Props for the StatsCards component
interface StatsCardsProps {
  stats: Stats;
  prevStats?: Partial<Stats>; // optional, for calculating changes
}

// Individual card configuration
interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  borderColor: string;
  testId: string;
}

// Storage interface
interface IStorage {
  getClassesByTeacher(userId: string): Promise<Class[]>;
  getStudentsByTeacherViaClasses(userId: string): Promise<(Student & { user: User })[]>;
  getAttendanceSessionsByTeacher(userId: string): Promise<AttendanceSession[]>;
  getClassStudents(classId: string): Promise<(Student & { user: User })[]>;
  getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]>;
  getRecognitionResults(sessionId: string): Promise<RecognitionResult[]>;
}

// Extended student type
type StudentWithUser = Student & { 
  user: User;
  isTrainingComplete: boolean;
};

export default function StatsCards({ stats, prevStats }: StatsCardsProps) {
  const calculateChange = (current: number, previous?: number): string => {
    // Ensure both values are safe numbers
    const safeCurrent = safeNumber(current, 0);
 if (previous === undefined) {
      return "No previous data";
    }
    
    const safePrevious = safeNumber(previous, 0);

    if (safePrevious === 0) {
      return "No previous data";
    }

    if (previous === undefined || safePrevious === 0) {
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

  // Safely extract and format values from stats
  const safeStats = {
    totalStudents: safeNumber(stats.totalStudents, 0),
    todayAttendance: safeNumber(stats.todayAttendance, 0),
    activeClasses: safeNumber(stats.activeClasses, 0),
    accuracy: safeNumber(stats.accuracy, 0)
  };

  const cards: StatCard[] = [
    {
      title: "Total Students",
      value: formatInteger(safeStats.totalStudents),
      change: calculateChange(safeStats.totalStudents, prevStats?.totalStudents),
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
        prevStats?.todayAttendance !== undefined ? safeNumber(prevStats.todayAttendance, 0) * 100 : undefined
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
      change: calculateChange(safeStats.activeClasses, prevStats?.activeClasses),
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
        prevStats?.accuracy !== undefined ? safeNumber(prevStats.accuracy, 0) * 100 : undefined
      ),
      icon: Brain,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      borderColor: "border-orange-200",
      testId: "stat-accuracy"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card: StatCard) => {
        const IconComponent: LucideIcon = card.icon;
        const changeColor: string = getChangeColor(card.change);

        return (
          <Card 
            key={card.testId} 
            className={`shadow-sm border-2 ${card.borderColor} hover:shadow-md transition-shadow`} 
            data-testid={card.testId}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    {card.title}
                  </p>
                  <p 
                    className="text-3xl font-bold text-gray-900" 
                    data-testid={`${card.testId}-value`}
                  >
                    {card.value}
                  </p>
                </div>
                <div className={`w-14 h-14 ${card.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`${card.iconColor} w-7 h-7`} />
                </div>
              </div>
              <div className="flex items-center">
                <span 
                  className={`text-sm font-medium ${changeColor}`}
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

export async function calculateTeacherStats(
  storage: IStorage, 
  userId: string, 
  today: Date = new Date()
): Promise<Stats> {
  try {
    const classes = await storage.getClassesByTeacher(userId);
    const allStudents = await storage.getStudentsByTeacherViaClasses(userId) as StudentWithUser[];

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const allSessions = await storage.getAttendanceSessionsByTeacher(userId);

    const todaySessions = allSessions.filter(session => {
      if (!session.date) return false;
      const sessionDate = new Date(session.date);
      return sessionDate >= todayStart && sessionDate < todayEnd;
    });

    let totalStudentsToday = 0;
    let presentStudentsToday = 0;

    for (const session of todaySessions) {
      if (!session.classId) continue;
      
      const classStudents = (await storage.getClassStudents(session.classId)).map(s => ({
        ...s,
        isTrainingComplete: s.isTrainingComplete ?? false,
        user: {
          id: s.userId ?? "",
          name: s.name,
          username: "",
          password: "",
          role: "student" as const,
          email: s.email,
          isActive: true,
          forcePasswordChange: false,
          lastLogin: null,
          createdAt: s.createdAt ?? new Date(),
        }
      }));

      const attendanceRecords = await storage.getAttendanceRecords(session.id);

      totalStudentsToday += classStudents.length;
      presentStudentsToday += attendanceRecords.filter(r => r.isPresent === true).length;
    }

    const todayAttendance = totalStudentsToday > 0 
      ? presentStudentsToday / totalStudentsToday 
      : 0;

    // Calculate accuracy from recent sessions
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = allSessions.filter(session => {
      if (!session.date) return false;
      const sessionDate = new Date(session.date);
      return sessionDate >= weekAgo;
    });

    let totalConfidenceSum = 0;
    let totalRecognitions = 0;

    for (const session of recentSessions) {
      const recognitionResults = await storage.getRecognitionResults(session.id);
      const validResults = recognitionResults.filter(r => 
        typeof r.confidence === "number" && 
        !isNaN(r.confidence) && 
        isFinite(r.confidence)
      );
      
      if (validResults.length > 0) {
        const sessionConfidence = validResults.reduce(
          (sum, r) => sum + (r.confidence ?? 0),
          0
        ) / validResults.length;
        
        if (!isNaN(sessionConfidence) && isFinite(sessionConfidence)) {
          totalConfidenceSum += sessionConfidence;
          totalRecognitions++;
        }
      }
    }

    const accuracy = totalRecognitions > 0 
      ? totalConfidenceSum / totalRecognitions 
      : 0;

    // Return safe values
    return {
      totalStudents: safeNumber(allStudents.length, 0),
      todayAttendance: safeNumber(todayAttendance, 0),
      activeClasses: safeNumber(classes.filter(c => (c as any).isActive).length, 0),
      accuracy: safeNumber(accuracy, 0),
    };
  } catch (error) {
    console.error("Error calculating teacher stats:", error);
    return {
      totalStudents: 0,
      todayAttendance: 0,
      activeClasses: 0,
      accuracy: 0,
    };
  }
}

export type { Stats, StatsCardsProps, StatCard, IStorage, StudentWithUser };