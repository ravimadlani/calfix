/**
 * WelcomeStep Component
 * First step of onboarding - shows welcome message and detected calendar provider
 */

import React from 'react';

interface WelcomeStepProps {
  providerName: string; // Auto-detected from Clerk (e.g., "Google Calendar" or "Outlook")
  onNext: () => void;
}

export default function WelcomeStep({ providerName, onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      {/* Success icon */}
      <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Welcome to CalendarZero
      </h1>

      {/* Show auto-detected calendar connection */}
      <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
        <p className="text-green-800 text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {providerName} connected
        </p>
      </div>

      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Your calendar is already connected. Let's finish setting up CalendarZero
        so you can start optimizing your schedule.
      </p>

      {/* Features highlight */}
      <div className="text-left max-w-md mx-auto mb-8 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-xl">📊</span>
          <div>
            <p className="font-medium text-gray-900">Health Score</p>
            <p className="text-sm text-gray-600">
              Track your calendar health and meeting load
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xl">🔄</span>
          <div>
            <p className="font-medium text-gray-900">Recurring Audit</p>
            <p className="text-sm text-gray-600">
              Analyze and optimize your recurring meetings
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xl">👥</span>
          <div>
            <p className="font-medium text-gray-900">Smart Scheduling</p>
            <p className="text-sm text-gray-600">
              Find the best times for your meetings
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Continue Setup
      </button>
    </div>
  );
}
