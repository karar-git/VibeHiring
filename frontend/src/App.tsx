import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import CandidateDetailPage from "@/pages/candidate-detail";
import SubscriptionPage from "@/pages/subscription";
import JobBoardPage from "@/pages/job-board";
import JobApplyPage from "@/pages/job-apply";
import InterviewsPage from "@/pages/interviews";
import MyApplicationsPage from "@/pages/my-applications";
import MyInterviewsPage from "@/pages/my-interviews";
import InterviewRoomPage from "@/pages/interview-room";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Protected Route Wrapper - requires login
function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType; allowedRoles?: ("hr" | "applicant")[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  // If role restriction is specified, redirect unauthorized roles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    setLocation(user.role === "applicant" ? "/board" : "/dashboard");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* HR-only routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} allowedRoles={["hr"]} />
      </Route>
      <Route path="/jobs">
        <ProtectedRoute component={JobsPage} allowedRoles={["hr"]} />
      </Route>
      <Route path="/jobs/:id">
        <ProtectedRoute component={JobDetailPage} allowedRoles={["hr"]} />
      </Route>
      <Route path="/candidates/:id">
        <ProtectedRoute component={CandidateDetailPage} allowedRoles={["hr"]} />
      </Route>
      <Route path="/subscription">
        <ProtectedRoute component={SubscriptionPage} allowedRoles={["hr"]} />
      </Route>
      <Route path="/interviews">
        <ProtectedRoute component={InterviewsPage} allowedRoles={["hr"]} />
      </Route>

      {/* Applicant-only routes */}
      <Route path="/my-applications">
        <ProtectedRoute component={MyApplicationsPage} allowedRoles={["applicant"]} />
      </Route>
      <Route path="/my-interviews/:id">
        <ProtectedRoute component={InterviewRoomPage} allowedRoles={["applicant"]} />
      </Route>
      <Route path="/my-interviews">
        <ProtectedRoute component={MyInterviewsPage} allowedRoles={["applicant"]} />
      </Route>

      {/* Public routes (accessible to anyone) */}
      <Route path="/board" component={JobBoardPage} />
      <Route path="/board/:id" component={JobApplyPage} />

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
