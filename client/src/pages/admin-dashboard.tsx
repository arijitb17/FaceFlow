"use client";

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
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response;
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) setLocation("/login");
  }, [setLocation]);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/me");
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  if (usersLoading) {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
  title="Dashboard"
  subtitle="Loading..."
  onCreateTeacher={() => {}}
  onCreateStudent={() => {}}
  onCreateAdmin={() => {}}
  onMenuClick={() => setIsSidebarOpen(true)}
  showActions={false}
/>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 mt-[72px]">
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Fixed header on mobile */}
        <Header
          title="Dashboard"
          subtitle="Manage users, classes, and system settings"
          onCreateTeacher={() => setShowCreateTeacher(true)}
          onCreateStudent={() => setShowCreateStudent(true)}
          onCreateAdmin={() => setShowCreateAdmin(true)}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6  lg:mt-0">
          <div className="mb-6">
            <StatsCards userRole="admin" />
          </div>
          <RecentUsers
            users={users}
            onViewAll={() => setLocation("/admin/users")}
          />
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
