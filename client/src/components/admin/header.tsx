import { Button } from "@/components/ui/button";
import { UserPlus, GraduationCap, Shield, Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  onCreateTeacher: () => void;
  onCreateStudent: () => void;
  onCreateAdmin: () => void;
  showActions?: boolean;
  onMenuClick?: () => void; // sidebar toggle
}

export default function Header({
  title,
  subtitle,
  onCreateTeacher,
  onCreateStudent,
  onCreateAdmin,
  showActions = true,
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Left: Title + Menu */}
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="sm:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm sm:text-base text-slate-600">{subtitle}</p>
        </div>
      </div>

      {/* Right: Action buttons */}
      {showActions && (
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            onClick={onCreateTeacher}
            className="bg-secondary text-white hover:bg-emerald-700 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Teacher</span>
          </Button>
          <Button
            onClick={onCreateStudent}
            className="bg-primary text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Add Student</span>
          </Button>
          <Button
            onClick={onCreateAdmin}
            className="bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>Add Admin</span>
          </Button>
        </div>
      )}
    </header>
  );
}
