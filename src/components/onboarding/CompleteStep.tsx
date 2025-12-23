/**
 * CompleteStep Component
 * Final step of onboarding - shows success message and redirects to dashboard
 */

import React, { useState } from 'react';

interface CompleteStepProps {
  onComplete: () => Promise<void>;
}

export default function CompleteStep({ onComplete }: CompleteStepProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete();
    } catch (error) {
      console.error('[CompleteStep] Error completing onboarding:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center">
      {/* Celebration icon */}
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
        <span className="text-4xl">🎉</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        You're All Set!
      </h1>

      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Your CalendarZero account is ready. Start optimizing your schedule and
        take control of your calendar today.
      </p>

      {/* Quick tips */}
      <div className="text-left max-w-md mx-auto mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="font-medium text-blue-900 mb-3">Quick tips to get started:</p>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            Check your Dashboard for your calendar health score
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            Review the Audit page to analyze recurring meetings
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            Use Schedule to find optimal meeting times
          </li>
        </ul>
      </div>

      <button
        onClick={handleComplete}
        disabled={isLoading}
        className={`
          px-8 py-3 font-medium rounded-lg transition-all
          ${
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5\" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Setting up...
          </span>
        ) : (
          'Go to Dashboard'
        )}
      </button>
    </div>
  );
}
