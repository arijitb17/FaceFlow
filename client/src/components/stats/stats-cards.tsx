import { Users, TrendingUp, GraduationCap, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  stats: {
    totalStudents: number;
    todayAttendance: string;
    activeClasses: number;
    accuracy: string;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Students",
      value: stats.totalStudents.toString(),
      change: "↗ 12% from last month",
      icon: Users,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      testId: "stat-total-students"
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      change: "↗ 3% from yesterday",
      icon: TrendingUp,
      bgColor: "bg-secondary/10",
      iconColor: "text-secondary",
      testId: "stat-today-attendance"
    },
    {
      title: "Active Classes",
      value: stats.activeClasses.toString(),
      change: "2 classes today",
      icon: GraduationCap,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
      testId: "stat-active-classes"
    },
    {
      title: "Recognition Accuracy",
      value: stats.accuracy,
      change: "↗ 0.8% improvement",
      icon: Brain,
      bgColor: "bg-destructive/10",
      iconColor: "text-destructive",
      testId: "stat-accuracy"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
