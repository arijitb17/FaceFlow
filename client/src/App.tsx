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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/live-attendance" component={LiveAttendance}/>
      <Route path="/students" component={Students}/>
      <Route path="/classes" component={Classes}/>
      <Route path="/training" component={Training}/>
      <Route path="/reports" component={Reports}/>
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
