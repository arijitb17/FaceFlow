import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal } from "lucide-react";
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
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (role: string) => {
    switch (role) {
      case "teacher":
        return "bg-secondary/10 text-secondary";
      case "student":
        return "bg-primary/10 text-primary";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "teacher":
        return "bg-secondary/10 text-secondary";
      case "student":
        return "bg-primary/10 text-primary";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="lg:col-span-2">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Recent Users</h3>
          <Button
            variant="ghost"
            onClick={onViewAll}
            className="text-primary hover:text-blue-700 text-sm font-medium"
            data-testid="button-view-all-users"
          >
            View All
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-0 text-sm font-medium text-slate-600">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Created</th>
                <th className="text-right py-3 px-0 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.slice(0, 5).map((user) => (
                <tr key={user.id} data-testid={`row-user-${user.id}`}>
                  <td className="py-4 px-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getAvatarColor(user.role)}`}>
                        <span className="text-xs font-medium">{getInitials(user.name)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900" data-testid={`text-user-name-${user.id}`}>{user.name}</p>
                        <p className="text-sm text-slate-500" data-testid={`text-user-email-${user.id}`}>
                          {user.email || user.student?.studentId || "No email"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={getRoleBadgeStyle(user.role)} data-testid={`badge-role-${user.id}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={getStatusBadgeStyle(user.isActive)} data-testid={`badge-status-${user.id}`}>
                      {user.isActive ? "Active" : "Pending"}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-500" data-testid={`text-created-${user.id}`}>
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </td>
                  <td className="py-4 px-0 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-slate-600"
                      data-testid={`button-actions-${user.id}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
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
