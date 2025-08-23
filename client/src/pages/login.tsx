import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, User, GraduationCap, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ username: "", password: "" });
  const [studentForm, setStudentForm] = useState({ studentId: "", password: "" });
  const { toast } = useToast();

  const teacherLoginMutation = useMutation({
    mutationFn: async (credentials: typeof teacherForm) => {
      return apiRequest("POST", "/api/auth/login", { ...credentials, role: "teacher" });
    },
    onSuccess: (data) => {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("userId", data.user.id);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.user.name}!`,
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const studentLoginMutation = useMutation({
    mutationFn: async (credentials: typeof studentForm) => {
      return apiRequest("POST", "/api/auth/student-login", credentials);
    },
    onSuccess: (data) => {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", "student");
      localStorage.setItem("userId", data.student.id);
      toast({
        title: "Login Successful",
        description: `Welcome, ${data.student.name}!`,
      });
      setLocation("/student-dashboard");
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid student ID or password",
        variant: "destructive",
      });
    },
  });

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.username || !teacherForm.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    teacherLoginMutation.mutate(teacherForm);
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.studentId || !studentForm.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both student ID and password",
        variant: "destructive",
      });
      return;
    }
    studentLoginMutation.mutate(studentForm);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <UserCheck className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="login-title">
            SmartAttend
          </h1>
          <p className="text-gray-600 mt-2" data-testid="login-subtitle">
            AI-Powered Attendance System
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="teacher" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="teacher" className="flex items-center space-x-2" data-testid="tab-teacher">
                  <User className="h-4 w-4" />
                  <span>Teacher</span>
                </TabsTrigger>
                <TabsTrigger value="student" className="flex items-center space-x-2" data-testid="tab-student">
                  <GraduationCap className="h-4 w-4" />
                  <span>Student</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="teacher" className="mt-6">
                <form onSubmit={handleTeacherLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="teacher-username">Username</Label>
                    <Input
                      id="teacher-username"
                      type="text"
                      value={teacherForm.username}
                      onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })}
                      placeholder="Enter your username"
                      data-testid="input-teacher-username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacher-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="teacher-password"
                        type={showPassword ? "text" : "password"}
                        value={teacherForm.password}
                        onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                        placeholder="Enter your password"
                        data-testid="input-teacher-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={teacherLoginMutation.isPending}
                    data-testid="button-teacher-login"
                  >
                    {teacherLoginMutation.isPending ? "Signing In..." : "Sign In as Teacher"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="student" className="mt-6">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="student-id">Student ID</Label>
                    <Input
                      id="student-id"
                      type="text"
                      value={studentForm.studentId}
                      onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                      placeholder="Enter your student ID"
                      data-testid="input-student-id"
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="student-password"
                        type={showPassword ? "text" : "password"}
                        value={studentForm.password}
                        onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                        placeholder="Enter your password"
                        data-testid="input-student-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-student-password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={studentLoginMutation.isPending}
                    data-testid="button-student-login"
                  >
                    {studentLoginMutation.isPending ? "Signing In..." : "Sign In as Student"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Demo Credentials:</p>
              <p>Teacher: username "teacher", password "password123"</p>
              <p>Student: Use any student ID with password "student123"</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}