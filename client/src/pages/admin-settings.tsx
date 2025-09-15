// ===== ADMIN SETTINGS - Mobile Fixed =====
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Save, Key, Eye, EyeOff, Menu } from "lucide-react";
import Sidebar from "@/components/admin/sidebar";

const apiRequest = async (method: string, url: string, body?: any) => {
  const token =
    localStorage.getItem("authToken") ??
    localStorage.getItem("auth_token") ??
    localStorage.getItem("token") ??
    localStorage.getItem("jwt");

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const res = await fetch(url, options);
  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      data && (data.message || data.error)
        ? data.message || data.error
        : `HTTP ${res.status}`;
    const err: any = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
};

interface AdminProfile {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  isActive: boolean;
  forcePasswordChange: boolean;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editValues, setEditValues] = useState({ name: "", email: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const { data: profile, isLoading } = useQuery<AdminProfile>({
    queryKey: ["me"],
    queryFn: () => apiRequest("GET", "/api/auth/me"),
  });

  useEffect(() => {
    if (profile) {
      setEditValues({
        name: profile.name ?? "",
        email: profile.email ?? "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const payload: any = {};
      
      if (editValues.name !== profile?.name && editValues.name.trim()) {
        payload.name = editValues.name;
      }
      if (editValues.email !== profile?.email && editValues.email.trim()) {
        payload.email = editValues.email;
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("No changes to save");
      }

      return await apiRequest("PATCH", "/api/auth/me", payload);
    },
    onSuccess: (data) => {
      toast({ 
        title: "Success", 
        description: "Profile updated successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (!passwordData.currentPassword || !passwordData.newPassword) {
        throw new Error("Please fill in all password fields");
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("New passwords do not match");
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const payload = {
        currentPassword: passwordData.currentPassword,
        password: passwordData.newPassword,
      };
      
      return await apiRequest("PATCH", "/api/auth/me", payload);
    },
    onSuccess: (data) => {
      toast({ 
        title: "Success", 
        description: "Password changed successfully" 
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to change password",
        variant: "destructive",
      });
    },
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
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white shadow-sm border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-semibold truncate">Admin Settings</h1>
              <p className="text-xs sm:text-base text-slate-600 hidden sm:block">Update your profile and password</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editValues.name}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
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
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  disabled={isLoading}
                  placeholder="you@example.com"
                />
              </div>

              <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-md">
                <strong>Username:</strong> {profile?.username}
              </div>

              <Button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending || !hasProfileChanges || isLoading}
                className="w-full sm:w-auto"
              >
                {updateProfile.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "current", label: "Current Password" },
                { key: "new", label: "New Password" },
                { key: "confirm", label: "Confirm New Password" }
              ].map((field) => (
                <div key={field.key}>
                  <Label htmlFor={`password-${field.key}`}>
                    {field.label}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`password-${field.key}`}
                      type={
                        showPasswords[field.key as keyof typeof showPasswords]
                          ? "text"
                          : "password"
                      }
                      value={passwordData[`${field.key}Password` as keyof typeof passwordData]}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          [`${field.key}Password`]: e.target.value,
                        }))
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key as keyof typeof prev],
                        }))
                      }
                    >
                      {showPasswords[field.key as keyof typeof showPasswords] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Password requirements */}
              <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-md">
                <p className="font-medium mb-1">Password requirements:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>At least 8 characters long</li>
                  <li>New password must match confirmation</li>
                </ul>
              </div>

              <Button
                onClick={() => changePassword.mutate()}
                disabled={changePassword.isPending || !isPasswordValid}
                className="w-full sm:w-auto"
              >
                {changePassword.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}