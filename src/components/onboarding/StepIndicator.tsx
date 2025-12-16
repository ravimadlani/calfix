/**
 * StepIndicator Component
 * Shows progress through onboarding steps
 */

import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({
  currentStep,
  totalSteps,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              font-medium text-sm transition-all duration-300
              ${
                step < currentStep
                  ? 'bg-green-600 text-white'
                  : step === currentStep
                    ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                    : 'bg-gray-200 text-gray-600'
              }
            `}
          >
            {step < currentStep ? (
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              step
            )}
          </div>

          {step < totalSteps && (
            <div
              className={`
                w-16 h-1 mx-2 rounded transition-all duration-500
                ${step < currentStep ? 'bg-green-600' : 'bg-gray-200'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  );
}
