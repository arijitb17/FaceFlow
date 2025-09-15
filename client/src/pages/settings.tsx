"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Key, Eye, EyeOff, RefreshCw, User as UserIcon, Shield } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const apiRequest = async (method: string, url: string, body?: any) => {
  const token = localStorage.getItem("authToken") ?? "";
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
};

interface TeacherProfile {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
}

export default function TeacherSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editValues, setEditValues] = useState({ name: "", email: "" });
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [userName, setUserName] = useState<string | null>(null);
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (!res.ok) throw new Error("Failed to fetch user");
        const user = await res.json();
        setUserName(user.name || "Guest");
      } catch (err) {
        console.error("Error fetching user:", err);
        setUserName("Guest");
      }
    }
    fetchUser();
  }, []);
  const { data: profile, isLoading } = useQuery<TeacherProfile>({
    queryKey: ["me"],
    queryFn: () => apiRequest("GET", "/api/auth/me"),
  });

  useEffect(() => {
    if (profile) {
      setEditValues({ name: profile.name ?? "", email: profile.email ?? "" });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const payload: any = {};
      if (editValues.name !== profile?.name && editValues.name.trim()) payload.name = editValues.name;
      if (editValues.email !== profile?.email && editValues.email.trim()) payload.email = editValues.email;
      if (Object.keys(payload).length === 0) throw new Error("No changes to save");
      return apiRequest("PATCH", "/api/auth/me", payload);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message || "Failed to update profile", variant: "destructive" }),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (!passwordData.currentPassword || !passwordData.newPassword) throw new Error("Please fill in all password fields");
      if (passwordData.newPassword !== passwordData.confirmPassword) throw new Error("New passwords do not match");
      if (passwordData.newPassword.length < 8) throw new Error("Password must be at least 8 characters");
      return apiRequest("PATCH", "/api/auth/me", {
        currentPassword: passwordData.currentPassword,
        password: passwordData.newPassword,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password changed successfully" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message || "Failed to change password", variant: "destructive" }),
  });

  const hasProfileChanges =
    (editValues.name !== profile?.name && editValues.name.trim()) ||
    (editValues.email !== profile?.email && editValues.email.trim());
  const isPasswordValid =
    passwordData.currentPassword &&
    passwordData.newPassword &&
    passwordData.confirmPassword &&
    passwordData.newPassword === passwordData.confirmPassword &&
    passwordData.newPassword.length >= 8;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
                  title="Settings"
                  subtitle="View your profile"
                  onMenuClick={() => setIsSidebarOpen(true)}
                  userName={userName ?? "Loading..."} 
                />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editValues.name}
                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                  disabled={isLoading}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editValues.email}
                  onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
                  disabled={isLoading}
                  placeholder="you@example.com"
                />
              </div>
              <div className="text-sm text-slate-600">
                <strong>Username:</strong> {profile?.username}
              </div>
              <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending || !hasProfileChanges || isLoading}>
                {updateProfile.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Change Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {["current", "new", "confirm"].map((key) => (
                <div key={key}>
                  <Label htmlFor={`password-${key}`}>
                    {key === "current" ? "Current Password" : key === "new" ? "New Password" : "Confirm New Password"}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`password-${key}`}
                      type={showPasswords[key as keyof typeof showPasswords] ? "text" : "password"}
                      value={passwordData[`${key}Password` as keyof typeof passwordData]}
                      onChange={(e) => setPasswordData({ ...passwordData, [`${key}Password`]: e.target.value })}
                      placeholder={`Enter ${key} password`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, [key]: !showPasswords[key as keyof typeof showPasswords] })
                      }
                    >
                      {showPasswords[key as keyof typeof showPasswords] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))}
              <div className="text-sm text-slate-600">
                <ul className="list-disc list-inside ml-2">
                  <li>At least 8 characters long</li>
                  <li>New password must match confirmation</li>
                </ul>
              </div>
              <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending || !isPasswordValid}>
                {changePassword.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
