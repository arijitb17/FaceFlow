import { formatDistanceToNow } from "date-fns";
import { User as UserIcon, BookOpen, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  student?: {
    studentId: string;
  };
}

interface RecentUsersProps {
  users: User[];
  onViewAll: () => void;
}

export default function RecentUsers({ users, onViewAll }: RecentUsersProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
const getAvatarColor = (role: string) => {
  const r = role.trim().toLowerCase();
  switch (r) {
    case "teacher":
      return "bg-blue-100 text-blue-700";
    case "student":
      return "bg-green-100 text-green-700";
    case "admin":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const getRoleBadge = (role: string) => {
  const r = role.trim().toLowerCase();
  switch (r) {
    case "teacher":
      return (
        <Badge className="flex items-center gap-1 px-2 py-1 text-sm rounded bg-blue-100 text-blue-700">
          <BookOpen className="w-3.5 h-3.5" /> Teacher
        </Badge>
      );
    case "student":
      return (
        <Badge className="flex items-center gap-1 px-2 py-1 text-sm rounded bg-green-100 text-green-700">
          <UserIcon className="w-3.5 h-3.5" /> Student
        </Badge>
      );
    case "admin":
      return (
        <Badge className="flex items-center gap-1 px-2 py-1 text-sm rounded bg-orange-100 text-orange-700">
          <UserIcon className="w-3.5 h-3.5" /> Admin
        </Badge>
      );
    default:
      return (
        <Badge className="flex items-center gap-1 px-2 py-1 text-sm rounded bg-gray-100 text-gray-600">
          <UserIcon className="w-3.5 h-3.5" /> {role}
        </Badge>
      );
  }
};


  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="flex items-center gap-1 px-2 py-1 text-sm rounded bg-green-100 text-green-700">
        <CheckCircle className="w-3.5 h-3.5" /> Active
      </Badge>
    ) : (
      <Badge className="flex items-center gap-1 px-2 py-1 text-sm rounded bg-yellow-100 text-yellow-800">
        <Clock className="w-3.5 h-3.5" /> Pending
      </Badge>
    );
  };

  return (
    <div className="lg:col-span-2">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
          <Button
            variant="ghost"
            onClick={onViewAll}
            className="text-primary hover:text-blue-700 text-sm font-medium"
          >
            View All
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] table-auto border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-gray-100 rounded-xl">
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">
                  User
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.slice(0, 5).map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  <td className="py-4 px-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${getAvatarColor(
                          user.role
                        )}`}
                      >
                        <span className="text-xs">{getInitials(user.name)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          {user.email || user.student?.studentId || "No email"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">{getRoleBadge(user.role)}</td>

                  <td className="py-4 px-4">{getStatusBadge(user.isActive)}</td>

                  <td className="py-4 px-4 text-sm text-gray-500">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
