/**
 * App Component
 * Root component with routing and Clerk authentication
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignInPage } from './components/SignInPage';
import { SignUpPage } from './components/SignUpPage';
import { UserProfilePage } from './components/UserProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import CalendarDashboard from './components/CalendarDashboard';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { OAuthCallback } from './components/OAuthCallback';
import RecurringPage from './components/RecurringPage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import { OnboardingGuard } from './components/OnboardingGuard';

function App() {
  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Onboarding Route - protected but no onboarding guard */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - with onboarding guard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <CalendarDashboard />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/*"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Admin Route - requires admin role */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        <Route
          path="/recurring"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <RecurringPage />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <SchedulePage />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
