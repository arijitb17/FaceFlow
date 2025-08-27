import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/admin/sidebar";
import CreateTeacherModal from "@/components/admin/create-teacher-modal";
import CreateStudentModal from "@/components/admin/create-student-modal";
import CredentialModal from "@/components/admin/credential-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Search, Filter, Edit2, Mail, Trash2, MoreHorizontal, Plus, Users } from "lucide-react";
import { useLocation } from "wouter";

// Fixed interface to match your schema
interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: "admin" | "teacher" | "student";
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  forcePasswordChange?: boolean;
  // These come from the getUserWithProfile queries
  student?: { 
    id: string;
    studentId: string; 
    rollNo: string; 
    yearLevel: number;
    program: string;
    email?: string;
  };
  teacher?: { 
    id: string;
    employeeId?: string; 
    department?: string; 
    userId: string;
  };
}

export default function UserManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLocation("/login");
    }
  }, [setLocation]);

  // Fixed: Fetch all users with proper error handling and token validation
  const { data: users = [], isLoading, error, refetch } = useQuery<User[]>({
    queryKey: ["/api/users", roleFilter, statusFilter],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      let url = "/api/users";
      const params: string[] = [];
      if (roleFilter !== "all") params.push(`role=${roleFilter}`);
      if (statusFilter !== "all") params.push(`status=${statusFilter}`);
      if (params.length) url += `?${params.join("&")}`;

      console.log("Fetching users from:", url); // Debug log

      const res = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("User fetch error:", res.status, errorText);
        throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Fetched users:", data); // Debug log
      return data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Delete user mutation - Fixed with better error handling
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to delete user" }));
        throw new Error(error.message || `Failed to delete user: ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSelectedUsers(new Set());
    },
    onError: (err: any) => {
      console.error("Delete user error:", err);
      toast({
        title: "Delete failed",
        description: err.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Update user status mutation - Fixed with better error handling
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to update user" }));
        throw new Error(error.message || `Failed to update user: ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (err: any) => {
      console.error("Update user error:", err);
      toast({
        title: "Update failed",
        description: err.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Send credentials mutation - Fixed with better error handling
  const sendCredentialsMutation = useMutation({
    mutationFn: async ({ userIds, message }: { userIds: string[]; message?: string }) => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const res = await fetch(`/api/users/send-credentials`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userIds, message }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to send credentials" }));
        throw new Error(error.message || `Failed to send credentials: ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      const successful = data.results?.filter((r: any) => r.success).length || 0;
      const failed = data.results?.filter((r: any) => !r.success).length || 0;
      
      toast({ 
        title: "Credentials sent", 
        description: `${successful} sent successfully${failed > 0 ? `, ${failed} failed` : ''}` 
      });
      setShowCredentialModal(false);
      setSelectedUsers(new Set());
    },
    onError: (err: any) => {
      console.error("Send credentials error:", err);
      toast({
        title: "Send failed",
        description: err.message || "Failed to send credentials",
        variant: "destructive",
      });
    },
  });

  const handleSelectUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) newSet.delete(userId);
    else newSet.add(userId);
    setSelectedUsers(newSet);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate({
      userId,
      updates: { isActive: !currentStatus }
    });
  };

  const handleSendCredentials = (message?: string) => {
    if (selectedUsers.size === 0) {
      toast({ 
        title: "No users selected", 
        description: "Select users to send credentials", 
        variant: "destructive" 
      });
      return;
    }
    
    sendCredentialsMutation.mutate({
      userIds: Array.from(selectedUsers),
      message
    });
  };

  // Filter users by search and tab
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.student?.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.student?.rollNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.teacher?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = currentTab === "all" || user.role === currentTab;
    return matchesSearch && matchesTab;
  });

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "teacher": return "bg-blue-100 text-blue-800";
      case "student": return "bg-green-100 text-green-800";
      case "admin": return "bg-orange-100 text-orange-800";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusBadgeStyle = (isActive: boolean) => 
    isActive ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";

  const getUserIdentifier = (user: User) => {
    if (user.student) {
      return `ID: ${user.student.studentId} | Roll: ${user.student.rollNo}`;
    }
    if (user.teacher) {
      return `Emp: ${user.teacher.employeeId || 'N/A'}`;
    }
    return user.email || user.username || "No identifier";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Users className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Failed to load users</h3>
            <p className="text-slate-500 mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-slate-600" />
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
                <p className="text-slate-600">Manage teachers and students</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                onClick={() => setShowCreateTeacher(true)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Teacher
              </Button>

              <Button 
                onClick={() => setShowCreateStudent(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Student
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex space-x-1">
              {['all', 'admin', 'teacher', 'student'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                    currentTab === tab 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab} {tab !== 'all' && `(${users.filter(u => u.role === tab).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex-1 max-w-md relative">
                <Input 
                  placeholder="Search users..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-10" 
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              <div className="flex items-center space-x-3">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {selectedUsers.size > 0 && (
                  <Button onClick={() => setShowCredentialModal(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Credentials ({selectedUsers.size})
                  </Button>
                )}

                <Button onClick={() => refetch()} variant="outline" size="sm">
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">
                    <Checkbox 
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0} 
                      onCheckedChange={handleSelectAll} 
                    />
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">Name</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">Role</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">Last Login</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">Created</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <Checkbox 
                        checked={selectedUsers.has(user.id)} 
                        onCheckedChange={() => handleSelectUser(user.id)} 
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-slate-500">{getUserIdentifier(user)}</p>
                          {user.email && <p className="text-xs text-slate-400">{user.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={getRoleBadgeStyle(user.role)} variant="secondary">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={getStatusBadgeStyle(user.isActive)} variant="secondary">
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : "Never"}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded" 
                          onClick={() => { 
                            setSelectedUsers(new Set([user.id])); 
                            setShowCredentialModal(true); 
                          }}
                          title="Send credentials"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`p-1 text-slate-400 rounded text-xs px-2 ${
                            user.isActive 
                              ? 'hover:text-yellow-600 hover:bg-yellow-50' 
                              : 'hover:text-green-600 hover:bg-green-50'
                          }`}
                          onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                          title={user.isActive ? "Deactivate user" : "Activate user"}
                          disabled={updateUserMutation.isPending}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        
                        {user.role !== "admin" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" 
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            title="Delete user"
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                          title="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
                <p>
                  {searchQuery 
                    ? "No users match your search criteria" 
                    : "No users found matching your filters"
                  }
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateTeacherModal 
        open={showCreateTeacher} 
        onClose={() => setShowCreateTeacher(false)} 
      />
      <CreateStudentModal 
        open={showCreateStudent} 
        onClose={() => setShowCreateStudent(false)} 
      />
      <CredentialModal
        open={showCredentialModal}
        onClose={() => {
          setShowCredentialModal(false);
          setSelectedUsers(new Set());
        }}
        selectedUsers={users
          .filter(u => selectedUsers.has(u.id))
          .map(u => ({
            id: u.id,
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            student: u.student ? {
              studentId: u.student.studentId,
              rollNo: u.student.rollNo,
            } : undefined,
            teacher: u.teacher ? {
              employeeId: u.teacher.employeeId || '',
              department: u.teacher.department || '',
            } : undefined,
          }))
        }
        onSend={handleSendCredentials}
      />
    </div>
  );
}