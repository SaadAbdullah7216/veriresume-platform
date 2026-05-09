import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import SignUp from "./pages/SignUp/SignUp";
import AuthSuccess from "./pages/AuthSuccess/AuthSuccess";
import EmailVerification from "./pages/EmailVerification/EmailVerification";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HRDashboardNew from "./pages/HRDashboard/HRDashboardNew";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import AdminUsers from "./pages/AdminDashboard/AdminUsers";
import AdminJobs from "./pages/AdminDashboard/AdminJobs";
import AdminAnomalies from "./pages/AdminDashboard/AdminAnomalies";
import AdminAnalytics from "./pages/AdminDashboard/AdminAnalytics";
import AdminPayments from "./pages/AdminDashboard/AdminPayments";
import AdminPremium from "./pages/AdminDashboard/AdminPremium";
import AdminSettings from "./pages/AdminDashboard/AdminSettings";
import AdminLogs from "./pages/AdminDashboard/AdminLogs";
import AIAnalyticsPage from "./pages/AIAnalytics/AIAnalytics";
import PaymentSuccess from "./pages/PaymentSuccess/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel/PaymentCancel";

// Job Seeker Dashboard Pages
import {
  JobSeekerDashboard,
  UploadResume,
  AIAnalysis,
  JobRecommendations,
  EnhancedResume,
  Notifications,
  Premium,
  ProfileSettings,
  Reanalyze,
  MyApplications,
  ExploreCompanies,
  FindJobs,
  JobDetailsPage,
  SavedJobs,
  ResumeEnhancementFraud,
} from "./pages/JobSeekerDashboard";

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        {/* <Navbar /> */}
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          
          {/* Job Seeker Dashboard - Main */}
          <Route 
            path="/dashboardjob" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <JobSeekerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/jobseeker/dashboard" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <JobSeekerDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Upload Resume */}
          <Route 
            path="/jobseeker/upload" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <UploadResume />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - AI Analysis */}
          <Route 
            path="/jobseeker/analysis" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <AIAnalysis />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - AI Analytics (Legacy) */}
          <Route 
            path="/jobseeker/analytics" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <AIAnalyticsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Job Recommendations */}
          <Route 
            path="/jobseeker/jobs" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <JobRecommendations />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Enhanced Resume */}
          <Route 
            path="/jobseeker/enhanced" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <EnhancedResume />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Resume Enhancement & Fraud Detection (Module 3) */}
          <Route 
            path="/jobseeker/enhancement-fraud" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <ResumeEnhancementFraud />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Notifications */}
          <Route 
            path="/jobseeker/notifications" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <Notifications />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Premium */}
          <Route 
            path="/jobseeker/premium" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <Premium />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Profile Settings */}
          <Route 
            path="/jobseeker/settings" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <ProfileSettings />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Reanalyze */}
          <Route 
            path="/jobseeker/reanalyze" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <Reanalyze />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - My Applications */}
          <Route 
            path="/jobseeker/applications" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <MyApplications />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Explore Companies */}
          <Route 
            path="/jobseeker/companies" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <ExploreCompanies />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Find Jobs (JSearch) */}
          <Route 
            path="/jobseeker/find-jobs" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <FindJobs />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Job Details */}
          <Route 
            path="/jobseeker/job/:jobId" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <JobDetailsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Job Seeker - Saved Jobs */}
          <Route 
            path="/jobseeker/saved-jobs" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <SavedJobs />
              </ProtectedRoute>
            } 
          />
          
          {/* Subscription Payment Pages */}
          <Route 
            path="/subscription/success" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <PaymentSuccess />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/subscription/cancel" 
            element={
              <ProtectedRoute requiredRole="jobseeker">
                <PaymentCancel />
              </ProtectedRoute>
            } 
          />
          
          {/* HR Dashboard */}
          <Route 
            path="/dashboardhr" 
            element={
              <ProtectedRoute requiredRole="hr">
                <HRDashboardNew />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Dashboard */}
          <Route 
            path="/dashboardadmin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/jobs" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminJobs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/anomalies" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminAnomalies />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/analytics" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/payments" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPayments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/premium" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPremium />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminSettings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/logs" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLogs />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
