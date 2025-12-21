/**
 * OnboardingPage Component
 * Multi-step onboarding flow for new users
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  WelcomeStep,
  CalendarNotConnected,
  SelectCalendarsStep,
  CompleteStep,
  StepIndicator,
} from '../components/onboarding';

interface OnboardingData {
  selectedCalendars: string[];
}

function OnboardingLoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Checking your calendar connection...</p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    selectedCalendars: [],
  });
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { subscription, isLoaded: subscriptionLoaded } = useSubscription();

  // Auto-detect connected provider via Clerk OAuth
  const {
    isAuthenticated: isCalendarConnected,
    activeProviderId,
  } = useCalendarProvider();

  // Check if auth checking is still happening
  const checkingAuth = !subscriptionLoaded;

  // Determine total steps based on tier (no provider selection step needed)
  const hasMultiCalendarAccess = subscription?.hasMultiCalendarAccess || false;
  // Basic: Welcome → Complete (2 steps)
  // EA/Pro: Welcome → Select Calendars → Complete (3 steps)
  const totalSteps = hasMultiCalendarAccess ? 3 : 2;

  const handleNext = (stepData?: Partial<OnboardingData>) => {
    if (stepData) {
      setData((prev) => ({ ...prev, ...stepData }));
    }
    setStep((prev) => prev + 1);
  };

  const handleComplete = async () => {
    const token = await getToken();

    // Save preferences and mark onboarding complete
    // Provider is auto-detected from Clerk - no manual selection needed
    await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        selected_calendar_ids:
          data.selectedCalendars.length > 0
            ? data.selectedCalendars
            : ['primary'], // Default to primary calendar for Basic tier
        active_provider: activeProviderId, // Auto-detected from Clerk
        onboarding_completed: true,
      }),
    });

    navigate('/dashboard');
  };

  // Show loading while checking Clerk OAuth status
  if (checkingAuth) {
    return <OnboardingLoadingState />;
  }

  // If no calendar connected via Clerk, show message to connect
  if (!isCalendarConnected) {
    return <CalendarNotConnected />;
  }

  // Determine provider name for display
  const providerName =
    activeProviderId === 'google' ? 'Google Calendar' : 'Outlook';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress Indicator */}
        <StepIndicator currentStep={step} totalSteps={totalSteps} />

        {/* Step Content */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          {step === 1 && (
            <WelcomeStep providerName={providerName} onNext={() => handleNext()} />
          )}

          {/* Calendar selection - only for EA/Pro tiers */}
          {step === 2 && hasMultiCalendarAccess && (
            <SelectCalendarsStep
              maxCalendars={subscription?.maxCalendars || 5}
              onNext={(calendars) => handleNext({ selectedCalendars: calendars })}
              onBack={() => setStep(1)}
            />
          )}

          {/* Complete step */}
          {((step === 2 && !hasMultiCalendarAccess) ||
            (step === 3 && hasMultiCalendarAccess)) && (
            <CompleteStep onComplete={handleComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
