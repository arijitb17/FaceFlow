import { Button } from "@/components/ui/button";
import { Camera, User, Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  showStartAttendance?: boolean;
  onStartAttendance?: () => void;
  onMenuClick?: () => void;
}

export default function Header({ 
  title, 
  subtitle, 
  showStartAttendance = false,
  onStartAttendance,
  onMenuClick
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            data-testid="mobile-menu-button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg lg:text-2xl font-semibold text-gray-900" data-testid="page-title">{title}</h2>
            <p className="text-sm lg:text-base text-gray-600" data-testid="page-subtitle">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 lg:space-x-4">
          {showStartAttendance && (
            <Button 
              onClick={onStartAttendance}
              className="bg-primary text-white hover:bg-primary/90 text-xs lg:text-sm px-2 lg:px-4"
              data-testid="button-start-attendance"
            >
              <Camera className="mr-1 lg:mr-2 h-3 lg:h-4 w-3 lg:w-4" />
              <span className="hidden sm:inline">Start Attendance</span>
              <span className="sm:hidden">Start</span>
            </Button>
          )}
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className="w-6 lg:w-8 h-6 lg:h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="text-gray-600 h-3 lg:h-4 w-3 lg:w-4" data-testid="user-avatar" />
            </div>
            <span className="text-gray-700 font-medium text-sm lg:text-base hidden sm:inline" data-testid="user-name">Prof. Johnson</span>
          </div>
        </div>
      </div>
    </header>
  );
}
