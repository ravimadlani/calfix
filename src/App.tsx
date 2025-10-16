/**
 * App Component
 * Root component with routing and Clerk authentication
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { SignInPage } from './components/SignInPage';
import { SignUpPage } from './components/SignUpPage';
import { UserProfilePage } from './components/UserProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import CalendarDashboard from './components/CalendarDashboard';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      />

      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

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

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
