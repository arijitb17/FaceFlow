// ===== USER MANAGEMENT - Mobile Fixed =====
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
import { Search, Filter, Edit2, Mail, Trash2, MoreHorizontal, Plus, Users, Menu } from "lucide-react";
import { useLocation } from "wouter";

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
  const [showFilters, setShowFilters] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLocation("/login");
    }
  }, [setLocation]);

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

      const res = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      return data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

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
      toast({
        title: "Delete failed",
        description: err.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

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
      toast({
        title: "Update failed",
        description: err.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

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

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-slate-50">
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-0">
        <header className="bg-white shadow-sm border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">User Management</h1>
                <p className="text-xs sm:text-base text-slate-600 hidden sm:block">Manage teachers and students</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                onClick={() => setShowCreateTeacher(true)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Teacher
              </Button>

              <Button 
                onClick={() => setShowCreateStudent(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Student
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 sm:mb-6">
            <div className="grid grid-cols-2 sm:flex gap-1 sm:gap-2">
              {['all', 'admin', 'teacher', 'student'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg capitalize transition-colors ${
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Input 
                    placeholder="Search users..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="pl-10" 
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="sm:hidden p-2"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              <div className={`flex flex-col sm:flex-row gap-3 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-32">
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
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {selectedUsers.size > 0 && (
                  <Button onClick={() => setShowCredentialModal(true)} className="w-full sm:w-auto">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Credentials ({selectedUsers.size})
                  </Button>
                )}

                <Button onClick={() => refetch()} variant="outline" size="sm" className="w-full sm:w-auto">
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
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
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                            {getInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                            <p className="text-sm text-slate-500 truncate">{getUserIdentifier(user)}</p>
                            {user.email && <p className="text-xs text-slate-400 truncate">{user.email}</p>}
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
                          <Button variant="ghost" size="sm" className="p-1">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="p-1">
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="p-1">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              {filteredUsers.map(user => (
                <div key={user.id} className="border-b border-slate-100 p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      checked={selectedUsers.has(user.id)} 
                      onCheckedChange={() => handleSelectUser(user.id)} 
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 truncate">{user.name}</p>
                          <p className="text-sm text-slate-500 break-words">{getUserIdentifier(user)}</p>
                          {user.email && <p className="text-xs text-slate-400 truncate">{user.email}</p>}
                        </div>
                        <Button variant="ghost" size="sm" className="p-1 ml-2 flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="mt-2 text-xs text-slate-500 space-y-1">
                        <div>Last login: {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : "Never"}</div>
                        <div>Created: {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
                <p className="text-sm sm:text-base">
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