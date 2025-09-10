import { useLocation } from "wouter";
import { ShieldCheck, LayoutDashboard, Users, GraduationCap, BookOpen, BarChart3, Settings, User, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  currentUser?: {
    name: string;
    role: string;
  };
}

export default function Sidebar({ currentUser }: SidebarProps) {
  const [location, setLocation] = useLocation();

  const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "User Management", path: "/admin/users" },
    { icon: GraduationCap, label: "Students", path: "/admin/students" },
    { icon: BookOpen, label: "Classes", path: "/admin/classes" },
    { icon: BarChart3, label: "Reports", path: "/admin/reports" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Admin Panel</h2>
            <p className="text-xs text-slate-500">System Management</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <li key={item.path}>
                <button
                  onClick={() => setLocation(item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900" data-testid="text-current-user">
              {currentUser?.name || "Admin User"}
            </p>
            <p className="text-xs text-slate-500">Administrator</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-700 hover:text-white hover:bg-red-500"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
