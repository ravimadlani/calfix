/**
 * App Component
 * Root component with routing and Clerk authentication
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignInPage } from './components/SignInPage';
import { SignUpPage } from './components/SignUpPage';
import { UserProfilePage } from './components/UserProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import CalendarDashboard from './components/CalendarDashboard';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { OAuthCallback } from './components/OAuthCallback';

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

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CalendarDashboard />
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

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
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
