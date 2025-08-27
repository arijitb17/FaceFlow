import { Users, GraduationCap, BookOpen, Activity } from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalTeachers: number;
    totalStudents: number;
    activeClasses: number;
    systemHealth: string;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Teachers",
      value: stats.totalTeachers,
      icon: Users,
      bgColor: "bg-secondary/10",
      iconColor: "text-secondary",
      change: "+2",
      changeLabel: "this month",
    },
    {
      title: "Total Students", 
      value: stats.totalStudents,
      icon: GraduationCap,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      change: "+47",
      changeLabel: "this month",
    },
    {
      title: "Active Classes",
      value: stats.activeClasses || 34,
      icon: BookOpen,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
      change: "+5",
      changeLabel: "this month",
    },
    {
      title: "System Health",
      value: stats.systemHealth || "99.8%",
      icon: Activity,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      change: "Excellent",
      changeLabel: "uptime",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className="text-3xl font-bold text-slate-900" data-testid={`stat-${card.title.toLowerCase().replace(' ', '-')}`}>
                  {card.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{card.change}</span>
              <span className="text-slate-500 ml-1">{card.changeLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
