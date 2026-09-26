import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import SkillDetail from "./pages/SkillDetail";
import UserProfile from "./pages/UserProfile";
import Wallet from "./pages/Wallet";
import Exchanges from "./pages/Exchanges";
import Messages from "./pages/Messages";
import Community from "./pages/Community";
import GroupLearning from "./pages/GroupLearning";
import Notifications from "./pages/Notifications";
import SettingsPrivacy from "./pages/SettingsPrivacy";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

// Protected Route Component: strictly redirects unauthenticated visitors to /login
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Component /> : null;
}

// Admin Route Component: strictly enforces admin or moderator role
function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
      } else if (!hasRole(["admin", "moderator"])) {
        setLocation("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, hasRole, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !hasRole(["admin", "moderator"])) return null;
  return <Component />;
}

// Root Route: Authenticated users visit /dashboard, unauthenticated visitors see the Landing Page
function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? null : <LandingPage />;
}

function Router() {
  return (
    <Switch>
      {/* Root Route: Dynamic switch based on auth */}
      <Route path="/" component={RootRoute} />

      {/* Public Exploration & Auth Routes */}
      <Route path="/discover" component={Discover} />
      <Route path="/skills/:id" component={SkillDetail} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />

      {/* Protected Student Routes */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
      <Route path="/messages" component={() => <ProtectedRoute component={Messages} />} />
      <Route path="/exchanges" component={() => <ProtectedRoute component={Exchanges} />} />
      <Route path="/community" component={() => <ProtectedRoute component={Community} />} />
      <Route path="/groups" component={() => <ProtectedRoute component={GroupLearning} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={UserProfile} />} />
      <Route path="/profile/:username" component={() => <ProtectedRoute component={UserProfile} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPrivacy} />} />
      <Route path="/settings/privacy" component={() => <ProtectedRoute component={SettingsPrivacy} />} />
      <Route path="/onboarding" component={() => <ProtectedRoute component={Onboarding} />} />

      {/* Strictly Protected Admin & Moderation Portal */}
      <Route path="/admin" component={() => <AdminRoute component={AdminDashboard} />} />

      {/* 404 Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster position="bottom-right" />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
