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
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const isAuthenticated = localStorage.getItem("authToken");
  const userRole = localStorage.getItem("userRole");
  
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }
  
  if (userRole === "student") {
    window.location.href = "/student-dashboard";
    return null;
  }
  
  return <Component />;
}

function StudentRoute({ component: Component }: { component: React.ComponentType }) {
  const isAuthenticated = localStorage.getItem("authToken");
  const userRole = localStorage.getItem("userRole");
  
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }
  
  if (userRole !== "student") {
    window.location.href = "/";
    return null;
  }
  
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
      <Route path="/login" component={Login}/>
      <Route path="/student-dashboard">
        <StudentRoute component={StudentDashboard} />
      </Route>
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
      <Route component={NotFound} />
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
