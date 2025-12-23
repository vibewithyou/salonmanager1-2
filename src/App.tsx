import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import SalonSetup from "./pages/SalonSetup";
import CalendarPage from "./pages/CalendarPage";
import InventoryPage from "./pages/InventoryPage";
import ReportsPage from "./pages/ReportsPage";
import SchedulePage from "./pages/SchedulePage";
import ClosuresPage from "./pages/ClosuresPage";
import Booking from "./pages/Booking";
import SalonBooking from "./pages/SalonBooking";
import NotFound from "./pages/NotFound";
import EmployeeInvite from "./pages/EmployeeInvite";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/* Use HashRouter instead of BrowserRouter so deep links work
             when the app is served from static hosting. This avoids 404
             errors when navigating directly to pages like /salon/:id. */}
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              {/* Forgot/Reset password flows */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/salon-setup" element={<SalonSetup />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/closures" element={<ClosuresPage />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/salon/:salonId" element={<SalonBooking />} />
              {/* Invite page for employees to set their password after accepting an invitation */}
              <Route path="/employee-invite" element={<EmployeeInvite />} />
              {/* Dedicated profile page for all user roles */}
              <Route path="/profile" element={<ProfilePage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
