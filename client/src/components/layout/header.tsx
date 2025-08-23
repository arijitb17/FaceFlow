import { Button } from "@/components/ui/button";
import { Camera, User } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  showStartAttendance?: boolean;
  onStartAttendance?: () => void;
}

export default function Header({ 
  title, 
  subtitle, 
  showStartAttendance = false,
  onStartAttendance 
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900" data-testid="page-title">{title}</h2>
          <p className="text-gray-600" data-testid="page-subtitle">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          {showStartAttendance && (
            <Button 
              onClick={onStartAttendance}
              className="bg-primary text-white hover:bg-primary/90"
              data-testid="button-start-attendance"
            >
              <Camera className="mr-2 h-4 w-4" />
              Start Attendance
            </Button>
          )}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="text-gray-600 h-4 w-4" data-testid="user-avatar" />
            </div>
            <span className="text-gray-700 font-medium" data-testid="user-name">Prof. Johnson</span>
          </div>
        </div>
      </div>
    </header>
  );
}
