"use client";

import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Loader from "@/components/ui/loader";
import { useEffect, useState } from "react";

// Pages
import Dashboard from "@/pages/dashboard";
import LiveAttendance from "@/pages/live-attendance";
import Students from "@/pages/students";
import Classes from "@/pages/classes";
import Training from "@/pages/training";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import StudentDashboard from "@/pages/student-dashboard";
import UserManagement from "@/pages/user-management";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSettings from "@/pages/admin-settings";
import AdminClasses from "@/pages/admin-classes";
import AdminStudents from "@/pages/admin-students";
import AdminReports from "@/pages/admin-reports";
import NotFound from "@/pages/not-found";

// ------------------ ProtectedRoute ------------------
interface ProtectedRouteProps {
  component: React.ComponentType;
  adminOnly?: boolean;
}

function ProtectedRoute({ component: Component, adminOnly = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function validate() {
      const token = localStorage.getItem("authToken");
      const role = localStorage.getItem("userRole");

      if (!token) {
        window.location.replace("/login");
        return;
      }

      try {
        const res = await apiRequest("GET", "/api/auth/me");
        const user = await res.json();

        if (adminOnly && user.role !== "admin") {
          window.location.replace("/");
          return;
        }

        if (!adminOnly && role === "student") {
          window.location.replace("/student-dashboard");
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error(err);
        localStorage.removeItem("authToken");
        window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    validate();
  }, [adminOnly]);

  if (loading) return <Loader message="Verifying authentication..." />;
  if (!authorized) return null;

  return <Component />;
}

// ------------------ StudentRoute ------------------
interface StudentRouteProps {
  component: React.ComponentType;
}

function StudentRoute({ component: Component }: StudentRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function validate() {
      const token = localStorage.getItem("authToken");
      const role = localStorage.getItem("userRole");

      if (!token) {
        window.location.replace("/login");
        return;
      }

      if (role !== "student") {
        window.location.replace("/");
        return;
      }

      try {
        await apiRequest("GET", "/api/auth/me");
        setAuthorized(true);
      } catch {
        localStorage.removeItem("authToken");
        window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    validate();
  }, []);

  if (loading) return <Loader message="Verifying authentication..." />;
  if (!authorized) return null;

  return <Component />;
}

// ------------------ HardReloadLink ------------------
// Instead of hard reload in the route itself, we trigger reload on link clicks
export function HardReloadLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault(); // prevent SPA navigation
        window.location.href = href; // trigger full reload
      }}
    >
      {children}
    </a>
  );
}

// ------------------ Router ------------------
function Router() {
  const isAuthenticated = localStorage.getItem("authToken");

  if (!isAuthenticated && window.location.pathname !== "/login") {
    window.location.replace("/login");
    return <Loader message="Redirecting..." />;
  }

  return (
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

      {/* Student route */}
      <Route path="/student-dashboard">
        <StudentRoute component={StudentDashboard} />
      </Route>

      {/* Other protected routes */}
      <Route path="/">
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

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

// ------------------ App ------------------
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
