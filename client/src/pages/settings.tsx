import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  Camera, 
  Database,
  Save,
  Eye,
  EyeOff
} from "lucide-react";

export default function Settings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    attendanceAlerts: true,
    weeklyReports: false,
    systemUpdates: true
  });
  const [systemSettings, setSystemSettings] = useState({
    captureInterval: "2",
    totalImages: "20",
    confidenceThreshold: "0.4",
    autoSave: true,
    darkMode: false
  });
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const response = await apiRequest("PUT", "/api/auth/change-password", data);
      return await response.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Password Update Failed",
        description: "Current password is incorrect",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string }) => {
      const response = await apiRequest("PUT", "/api/auth/profile", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handlePasswordChange = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate(passwordForm);
  };

  const saveNotificationSettings = () => {
    // Save notification settings
    localStorage.setItem("notificationSettings", JSON.stringify(notificationSettings));
    toast({
      title: "Settings Saved",
      description: "Notification preferences have been updated",
    });
  };

  const saveSystemSettings = () => {
    // Save system settings
    localStorage.setItem("systemSettings", JSON.stringify(systemSettings));
    toast({
      title: "Settings Saved",
      description: "System preferences have been updated",
    });
  };

  return (
    <div className="flex h-screen">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Settings" 
          subtitle="Manage your account and system preferences"
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
            {/* Profile Settings */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2" data-testid="profile-settings-title">
                  <User className="h-5 w-5" />
                  <span>Profile Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      defaultValue={currentUser?.name || ""}
                      placeholder="Enter your full name"
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={currentUser?.username || ""}
                      disabled
                      className="bg-gray-50"
                      data-testid="input-username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={currentUser?.role || ""}
                      disabled
                      className="bg-gray-50"
                      data-testid="input-role"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const name = (document.getElementById("name") as HTMLInputElement)?.value;
                    const email = (document.getElementById("email") as HTMLInputElement)?.value;
                    if (name) {
                      updateProfileMutation.mutate({ name, email });
                    }
                  }}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2" data-testid="security-settings-title">
                  <Shield className="h-5 w-5" />
                  <span>Security Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                        data-testid="input-current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        data-testid="button-toggle-current-password"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        data-testid="input-new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        data-testid="button-toggle-new-password"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={updatePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  {updatePasswordMutation.isPending ? "Updating..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2" data-testid="notification-settings-title">
                  <Bell className="h-5 w-5" />
                  <span>Notification Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-gray-600">Receive general system notifications via email</p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                      }
                      data-testid="switch-email-notifications"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="attendance-alerts">Attendance Alerts</Label>
                      <p className="text-sm text-gray-600">Get notified when attendance is low</p>
                    </div>
                    <Switch
                      id="attendance-alerts"
                      checked={notificationSettings.attendanceAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, attendanceAlerts: checked })
                      }
                      data-testid="switch-attendance-alerts"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly-reports">Weekly Reports</Label>
                      <p className="text-sm text-gray-600">Receive weekly attendance summary reports</p>
                    </div>
                    <Switch
                      id="weekly-reports"
                      checked={notificationSettings.weeklyReports}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, weeklyReports: checked })
                      }
                      data-testid="switch-weekly-reports"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="system-updates">System Updates</Label>
                      <p className="text-sm text-gray-600">Get notified about system maintenance and updates</p>
                    </div>
                    <Switch
                      id="system-updates"
                      checked={notificationSettings.systemUpdates}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, systemUpdates: checked })
                      }
                      data-testid="switch-system-updates"
                    />
                  </div>
                </div>
                <Button onClick={saveNotificationSettings} data-testid="button-save-notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2" data-testid="system-settings-title">
                  <Camera className="h-5 w-5" />
                  <span>Camera & Recognition Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capture-interval">Default Capture Interval</Label>
                    <Select 
                      value={systemSettings.captureInterval} 
                      onValueChange={(value) => setSystemSettings({ ...systemSettings, captureInterval: value })}
                    >
                      <SelectTrigger data-testid="select-capture-interval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 second</SelectItem>
                        <SelectItem value="2">2 seconds</SelectItem>
                        <SelectItem value="3">3 seconds</SelectItem>
                        <SelectItem value="5">5 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="total-images">Default Total Images</Label>
                    <Input
                      id="total-images"
                      type="number"
                      value={systemSettings.totalImages}
                      onChange={(e) => setSystemSettings({ ...systemSettings, totalImages: e.target.value })}
                      placeholder="20"
                      min="5"
                      max="50"
                      data-testid="input-total-images"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confidence-threshold">Recognition Confidence Threshold</Label>
                    <Select 
                      value={systemSettings.confidenceThreshold} 
                      onValueChange={(value) => setSystemSettings({ ...systemSettings, confidenceThreshold: value })}
                    >
                      <SelectTrigger data-testid="select-confidence-threshold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.3">30% (Low)</SelectItem>
                        <SelectItem value="0.4">40% (Medium)</SelectItem>
                        <SelectItem value="0.5">50% (High)</SelectItem>
                        <SelectItem value="0.6">60% (Very High)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-save"
                      checked={systemSettings.autoSave}
                      onCheckedChange={(checked) => 
                        setSystemSettings({ ...systemSettings, autoSave: checked })
                      }
                      data-testid="switch-auto-save"
                    />
                    <Label htmlFor="auto-save">Auto-save attendance results</Label>
                  </div>
                </div>
                <Button onClick={saveSystemSettings} data-testid="button-save-system-settings">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Save System Settings
                </Button>
              </CardContent>
            </Card>

            {/* Database Settings */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2" data-testid="database-settings-title">
                  <Database className="h-5 w-5" />
                  <span>Data Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button variant="outline" data-testid="button-export-data">
                    Export All Data
                  </Button>
                  <Button variant="outline" data-testid="button-clear-old-sessions">
                    Clear Old Sessions
                  </Button>
                  <Button variant="outline" className="text-destructive hover:text-destructive" data-testid="button-reset-system">
                    Reset System
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Export All Data:</strong> Download all attendance records and student data</p>
                  <p><strong>Clear Old Sessions:</strong> Remove attendance sessions older than 6 months</p>
                  <p><strong>Reset System:</strong> Clear all data and reset to factory defaults</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}