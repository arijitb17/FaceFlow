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

// Helper function to make API requests
const apiRequest = async (method: string, url: string, body?: any) => {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    ...(body && { body: JSON.stringify(body) }),
  };
  
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response;
};

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [teacherForm, setTeacherForm] = useState({ username: "", password: "" });
  const [studentForm, setStudentForm] = useState({ email: "", rollNo: "", password: "" });
  const { toast } = useToast();

  // ----------------- Mutations -----------------
  const adminLoginMutation = useMutation({
    mutationFn: async (credentials: typeof adminForm) => {
  const response = await apiRequest("POST", "/api/auth/login", { 
    username: credentials.username.trim().toLowerCase(),
    password: credentials.password,
    role: "admin" 
  });
  return await response.json();
},

    onSuccess: (data) => {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", "admin");
      localStorage.setItem("userId", data.user.id);
      toast({ 
        title: "Login Successful", 
        description: `Welcome back, ${data.user.name}!` 
      });
      setLocation("/admin");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid credentials", 
        variant: "destructive" 
      });
    },
  });

  const teacherLoginMutation = useMutation({
    mutationFn: async (credentials: typeof teacherForm) => {
      const response = await apiRequest("POST", "/api/auth/login", { 
        ...credentials, 
        role: "teacher" 
      });
      return await response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("userId", data.user.id);
      toast({ 
        title: "Login Successful", 
        description: `Welcome back, ${data.user.name}!` 
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid username or password", 
        variant: "destructive" 
      });
    },
  });

  const studentLoginMutation = useMutation({
    mutationFn: async (credentials: typeof studentForm) => {
      const response = await apiRequest("POST", "/api/auth/student-login", credentials);
      return await response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", "student");
      localStorage.setItem("userId", data.user.id);
      toast({ 
        title: "Login Successful", 
        description: `Welcome, ${data.user.name}!` 
      });
      setLocation("/student-dashboard");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid student credentials", 
        variant: "destructive" 
      });
    },
  });

  // ----------------- Handlers -----------------
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.username || !adminForm.password) {
      toast({ 
        title: "Missing Information", 
        description: "Enter both username and password", 
        variant: "destructive" 
      });
      return;
    }
    adminLoginMutation.mutate(adminForm);
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.username || !teacherForm.password) {
      toast({ 
        title: "Missing Information", 
        description: "Enter both username and password", 
        variant: "destructive" 
      });
      return;
    }
    teacherLoginMutation.mutate(teacherForm);
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.email || !studentForm.rollNo || !studentForm.password) {
      toast({ 
        title: "Missing Information", 
        description: "Enter email, roll number, and password", 
        variant: "destructive" 
      });
      return;
    }
    studentLoginMutation.mutate(studentForm);
  };

  // ----------------- Render -----------------
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <UserCheck className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SmartAttend</h1>
          <p className="text-gray-600 mt-2">AI-Powered Attendance System</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="admin" className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" /> <span>Admin</span>
                </TabsTrigger>
                <TabsTrigger value="teacher" className="flex items-center space-x-2">
                  <User className="h-4 w-4" /> <span>Teacher</span>
                </TabsTrigger>
                <TabsTrigger value="student" className="flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4" /> <span>Student</span>
                </TabsTrigger>
              </TabsList>

              {/* Admin Form */}
              <TabsContent value="admin" className="mt-6">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="admin-username">Username</Label>
                    <Input
                      id="admin-username"
                      type="text"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                      placeholder="Enter your username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                        placeholder="Enter your password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={adminLoginMutation.isPending}>
                    {adminLoginMutation.isPending ? "Signing In..." : "Sign In as Admin"}
                  </Button>
                </form>
              </TabsContent>

              {/* Teacher Form */}
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
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={teacherLoginMutation.isPending}>
                    {teacherLoginMutation.isPending ? "Signing In..." : "Sign In as Teacher"}
                  </Button>
                </form>
              </TabsContent>

              {/* Student Form */}
              <TabsContent value="student" className="mt-6">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="student-email">Email</Label>
                    <Input
                      id="student-email"
                      type="email"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-rollNo">Roll Number</Label>
                    <Input
                      id="student-rollNo"
                      type="text"
                      value={studentForm.rollNo}
                      onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                      placeholder="Enter your roll number"
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
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={studentLoginMutation.isPending}>
                    {studentLoginMutation.isPending ? "Signing In..." : "Sign In as Student"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Demo Credentials:</p>
              <p>Admin: username "admin", password "admin123"</p>
              <p>Teacher: username "teacher", password "teacher123"</p>
              <p>Student: email "student@demo.com", rollNo "R001", password "student123"</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}