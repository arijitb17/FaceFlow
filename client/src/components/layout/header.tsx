import { Button } from "@/components/ui/button";
import { Camera, User, Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  userName?: string; // <-- add this
  showStartAttendance?: boolean;
  onStartAttendance?: () => void;
  onMenuClick?: () => void;
}

export default function Header({ 
  title, 
  subtitle, 
  userName = "Guest", // default fallback
  showStartAttendance = false,
  onStartAttendance,
  onMenuClick
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg lg:text-2xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm lg:text-base text-gray-600">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 lg:space-x-4">
          {showStartAttendance && (
            <Button 
              onClick={onStartAttendance}
              className="bg-primary text-white hover:bg-primary/90 text-xs lg:text-sm px-2 lg:px-4"
            >
              <Camera className="mr-1 lg:mr-2 h-3 lg:h-4 w-3 lg:w-4" />
              <span className="hidden sm:inline">Start Attendance</span>
              <span className="sm:hidden">Start</span>
            </Button>
          )}
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className="w-6 lg:w-8 h-6 lg:h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="text-gray-600 h-3 lg:h-4 w-3 lg:w-4" />
            </div>
            <span className="text-gray-700 font-medium text-sm lg:text-base hidden sm:inline">
              {userName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
