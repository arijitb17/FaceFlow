import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import LiveAttendance from "@/pages/live-attendance";
import Students from "@/pages/students";
import Classes from "@/pages/classes";
import Training from "@/pages/training";
import Reports from "@/pages/reports";
import Login from "@/pages/login";
import Settings from "@/pages/settings";
import StudentDashboard from "@/pages/student-dashboard";
import UserManagement from "@/pages/user-management";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin-dashboard";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import AdminSettings from "@/pages/admin-settings";
import AdminClasses from "@/pages/admin-classes";
import AdminStudents from "@/pages/admin-students";
import AdminReports from "@/pages/admin-reports";

interface ProtectedRouteProps {
  component: React.ComponentType; // <-- this fixes the 'any' error
  adminOnly?: boolean;
}
export function ProtectedRoute({ component: Component, adminOnly = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function validate() {
      const token = localStorage.getItem("authToken");
      const role = localStorage.getItem("userRole");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await apiRequest("GET", "/api/auth/me");
        const user = await res.json();

        if (adminOnly && user.role !== "admin") {
          window.location.href = "/";
          return;
        }

        if (!adminOnly && role === "student") {
          window.location.href = "/student-dashboard";
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error(err);
        localStorage.removeItem("authToken");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    }

    validate();
  }, [adminOnly]);

  if (loading) return <div>Loading...</div>;
  if (!authorized) return null;

  return <Component />;
}

interface StudentRouteProps {
  component: React.ComponentType;
}

export function StudentRoute({ component: Component }: StudentRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function validate() {
      const token = localStorage.getItem("authToken");
      const role = localStorage.getItem("userRole");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      if (role !== "student") {
        window.location.href = "/";
        return;
      }

      try {
        await apiRequest("GET", "/api/auth/me");
        setAuthorized(true);
      } catch {
        localStorage.removeItem("authToken");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    }

    validate();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!authorized) return null;

  return <Component />;
}
function Router() {
  const isAuthenticated = localStorage.getItem("authToken");
  
  if (!isAuthenticated && window.location.pathname !== "/login") {
    window.location.href = "/login";
    return null;
  }
  
  return (
    <Switch>
      <Switch>
  <Route path="/login" component={Login} />
  
  {/* Admin routes */}
  <Route path="/admin">
    <ProtectedRoute component={AdminDashboard} adminOnly />
  </Route>
  <Route path="/admin/users">
    <ProtectedRoute component={UserManagement} adminOnly />
  </Route>
<Route path="/admin/settings">
    <ProtectedRoute component={AdminSettings} adminOnly />
  </Route>
  <Route path="/admin/classes">
    <ProtectedRoute component={AdminClasses} adminOnly />
  </Route>
   <Route path="/admin/students">
    <ProtectedRoute component={AdminStudents} adminOnly />
  </Route>
   <Route path="/admin/reports">
    <ProtectedRoute component={AdminReports} adminOnly />
  </Route>
  {/* Student routes */}
  <Route path="/student-dashboard">
    <StudentRoute component={StudentDashboard} />
  </Route>

  {/* Other protected routes */}
  <Route path="/" >
    <ProtectedRoute component={Dashboard} />
  </Route>
  <Route path="/live-attendance">
    <ProtectedRoute component={LiveAttendance} />
  </Route>
  <Route path="/students">
    <ProtectedRoute component={Students} />
  </Route>
  <Route path="/classes">
    <ProtectedRoute component={Classes} />
  </Route>
  <Route path="/training">
    <ProtectedRoute component={Training} />
  </Route>
  <Route path="/reports">
    <ProtectedRoute component={Reports} />
  </Route>
  <Route path="/settings">
    <ProtectedRoute component={Settings} />
  </Route>

  <Route component={NotFound} />
</Switch>

    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
