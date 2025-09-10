import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/admin/sidebar";
import Header from "@/components/admin/header";
import StatsCards from "@/components/stats/stats-cards";
import RecentUsers from "@/components/admin/recent-users";
import CreateTeacherModal from "@/components/admin/create-teacher-modal";
import CreateStudentModal from "@/components/admin/create-student-modal";
import CreateAdminModal from "@/components/admin/create-admin-modal";
import CredentialModal from "@/components/admin/credential-modal";

// Helper function to make authenticated API requests
const apiRequest = async (method: string, url: string, body?: any) => {
  const token = localStorage.getItem("authToken");
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  };
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLocation("/login");
    }
  }, [setLocation]);

  // ----------------- Queries -----------------
  
  // No need for separate stats query - StatsCards component handles this internally
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return await response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/me");
      return await response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (usersLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar currentUser={currentUser} />
        <div className="flex-1 flex flex-col min-h-0">
          <Header
            title="Dashboard"
            subtitle="Loading..."
            onCreateTeacher={() => {}}
            onCreateStudent={() => {}}
            onCreateAdmin={() => {}}
            showActions={false}
          />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentUser={currentUser} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          title="Dashboard"
          subtitle="Manage users, classes, and system settings"
          onCreateTeacher={() => setShowCreateTeacher(true)}
          onCreateStudent={() => setShowCreateStudent(true)}
          onCreateAdmin={() => setShowCreateAdmin(true)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* StatsCards component handles its own data fetching */}
          <div className="mb-6">
            <StatsCards userRole="admin" />
          </div>
          
          <div className="gap-6">
            <RecentUsers
              users={users}
              onViewAll={() => setLocation("/admin/users")}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateTeacherModal
        open={showCreateTeacher}
        onClose={() => setShowCreateTeacher(false)}
      />
      <CreateStudentModal
        open={showCreateStudent}
        onClose={() => setShowCreateStudent(false)}
      />
      <CreateAdminModal
        open={showCreateAdmin}
        onClose={() => setShowCreateAdmin(false)}
      />
      <CredentialModal
        open={showCredentialModal}
        onClose={() => setShowCredentialModal(false)}
        selectedUsers={users}
        onSend={(data) => {
          console.log("Sending credentials to selected users:", data);
          toast({ title: "Credentials sent", description: "Check console for details" });
          setShowCredentialModal(false);
        }}
      />
    </div>
  );
}