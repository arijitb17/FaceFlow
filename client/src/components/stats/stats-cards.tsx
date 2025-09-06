import { Users, TrendingUp, GraduationCap, Brain, Clock, BarChart2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  totalStudents: number;
  todayAttendance: number; // 0.85 for 85%
  activeClasses: number;
  accuracy: number; // 0.95 for 95%
  totalSessions: number;
  completedSessions: number;
  avgStudentsPerClass: number;
}

interface StatsCardsProps {
  stats: Stats;
  prevStats?: Partial<Stats>; // optional, for calculating changes
}

export default function StatsCards({ stats, prevStats }: StatsCardsProps) {
  // Helper to calculate percentage change
  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return "0 this month";
    const diff = current - previous;
    const percent = ((diff / previous) * 100).toFixed(1);
    return diff >= 0 ? `↗ ${percent}%` : `↘ ${Math.abs(Number(percent))}%`;
  };

  const cards = [
    {
      title: "Total Students",
      value: stats.totalStudents.toString(),
      change: calculateChange(stats.totalStudents, prevStats?.totalStudents),
      icon: Users,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      testId: "stat-total-students"
    },
    {
      title: "Today's Attendance",
      value: `${(stats.todayAttendance * 100).toFixed(1)}%`,
      change: calculateChange(stats.todayAttendance, prevStats?.todayAttendance),
      icon: TrendingUp,
      bgColor: "bg-secondary/10",
      iconColor: "text-secondary",
      testId: "stat-today-attendance"
    },
    {
      title: "Active Classes",
      value: stats.activeClasses.toString(),
      change: calculateChange(stats.activeClasses, prevStats?.activeClasses),
      icon: GraduationCap,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
      testId: "stat-active-classes"
    },
    {
      title: "Recognition Accuracy",
      value: `${(stats.accuracy * 100).toFixed(1)}%`,
      change: calculateChange(stats.accuracy, prevStats?.accuracy),
      icon: Brain,
      bgColor: "bg-destructive/10",
      iconColor: "text-destructive",
      testId: "stat-accuracy"
    },
    {
      title: "Total Sessions",
      value: stats.totalSessions.toString(),
      change: calculateChange(stats.totalSessions, prevStats?.totalSessions),
      icon: Clock,
      bgColor: "bg-info/10",
      iconColor: "text-info",
      testId: "stat-total-sessions"
    },
    {
      title: "Avg Students/Class",
      value: stats.avgStudentsPerClass.toFixed(1),
      change: calculateChange(stats.avgStudentsPerClass, prevStats?.avgStudentsPerClass),
      icon: BarChart2,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
      testId: "stat-avg-students"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card key={card.testId} className="shadow-sm border border-gray-200" data-testid={card.testId}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900" data-testid={`${card.testId}-value`}>
                  {card.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.iconColor} text-xl`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-secondary text-sm font-medium" data-testid={`${card.testId}-change`}>
                {card.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
