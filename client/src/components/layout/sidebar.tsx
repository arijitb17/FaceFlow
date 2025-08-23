import { Link, useLocation } from "wouter";
import { 
  Camera, 
  ChartLine, 
  Users, 
  GraduationCap, 
  Brain, 
  BarChart3, 
  Settings, 
  LogOut,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Live Attendance", href: "/live-attendance", icon: Camera },
  { name: "Students", href: "/students", icon: Users },
  { name: "Classes", href: "/classes", icon: GraduationCap },
  { name: "Training", href: "/training", icon: Brain },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

const bottomNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <UserCheck className="text-white text-lg" data-testid="logo-icon" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900" data-testid="app-title">SmartAttend</h1>
            <p className="text-sm text-gray-500" data-testid="app-subtitle">AI Recognition</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
        
        <div className="mt-8 px-4">
          <div className="border-t border-gray-200 pt-4">
            {bottomNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
            <button
              onClick={() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("userRole");
                localStorage.removeItem("userId");
                window.location.href = "/login";
              }}
              className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="nav-logout"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
