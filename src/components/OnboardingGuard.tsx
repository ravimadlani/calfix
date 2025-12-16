/**
 * OnboardingGuard Component
 * Redirects users who haven't completed onboarding to the onboarding flow
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

function FullPageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { status } = useOnboardingStatus();
  const location = useLocation();

  // Show loader while checking onboarding status
  if (status === 'loading') {
    return <FullPageLoader />;
  }

  // If onboarding is required and we're not already on the onboarding page, redirect
  if (status === 'required' && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export default OnboardingGuard;
