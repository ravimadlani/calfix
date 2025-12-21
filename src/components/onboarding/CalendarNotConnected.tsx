/**
 * CalendarNotConnected Component
 * Shows when no calendar is connected via Clerk OAuth
 * Directs users to Clerk's UserProfile to connect their calendar
 */

import React from 'react';
import { UserButton } from '@clerk/clerk-react';

export default function CalendarNotConnected() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Calendar icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Connect Your Calendar
        </h1>

        <p className="text-gray-600 mb-6">
          To use CalendarZero, you need to connect your Google or Microsoft
          calendar. Click on your profile below to add a calendar connection.
        </p>

        {/* Clerk UserButton - opens profile where user can connect OAuth providers */}
        <div className="flex justify-center mb-6">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-16 h-16',
              },
            }}
          />
        </div>

        <div className="text-sm text-gray-500 space-y-2">
          <p>
            Click your profile icon above, then go to{' '}
            <strong>"Connected accounts"</strong> to add Google or Microsoft.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          I've connected my calendar - refresh
        </button>

        {/* Help text */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Supported calendars:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center gap-2">
              <span>📅</span> Google Calendar
            </li>
            <li className="flex items-center gap-2">
              <span>📧</span> Microsoft Outlook
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
