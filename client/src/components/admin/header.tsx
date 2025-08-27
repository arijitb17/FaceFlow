import { Button } from "@/components/ui/button";
import { UserPlus, GraduationCap, Shield } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  onCreateTeacher: () => void;
  onCreateStudent: () => void;
  onCreateAdmin: () => void; // ✅ new callback for admin
  showActions?: boolean;
}

export default function Header({
  title,
  subtitle,
  onCreateTeacher,
  onCreateStudent,
  onCreateAdmin,
  showActions = true,
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            data-testid="text-page-title"
          >
            {title}
          </h1>
          <p className="text-slate-600" data-testid="text-page-subtitle">
            {subtitle}
          </p>
        </div>
        {showActions && (
          <div className="flex items-center space-x-4">
            {/* Add Teacher */}
            <Button
              onClick={onCreateTeacher}
              className="bg-secondary text-white hover:bg-emerald-700 transition-colors font-medium flex items-center space-x-2"
              data-testid="button-add-teacher"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Teacher</span>
            </Button>

            {/* Add Student */}
            <Button
              onClick={onCreateStudent}
              className="bg-primary text-white hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
              data-testid="button-add-student"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Add Student</span>
            </Button>

            {/* Add Admin */}
            <Button
              onClick={onCreateAdmin}
              className="bg-amber-600 text-white hover:bg-amber-700 transition-colors font-medium flex items-center space-x-2"
              data-testid="button-add-admin"
            >
              <Shield className="w-4 h-4" />
              <span>Add Admin</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
