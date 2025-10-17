/**
 * GoogleCalendarConnectPrompt Component
 * Welcome screen shown when user is authenticated with Clerk but hasn't connected Google Calendar yet
 */

import React from 'react';
import { signIn } from '../services/googleAuth';
import { UserButton } from '@clerk/clerk-react';

const GoogleCalendarConnectPrompt = () => {
  const handleConnect = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      alert('Failed to initiate Google Calendar connection. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      {/* Header with User Button */}
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center space-y-8">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 shadow-2xl">
              <span className="text-6xl" role="img" aria-label="Calendar">
                📅
              </span>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Welcome to CalFix
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your intelligent calendar assistant for better time management
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Analytics</h3>
              <p className="text-sm text-gray-600">
                Get insights on meeting patterns, back-to-back conflicts, and focus time
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="text-3xl mb-3">✈️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Travel Intelligence</h3>
              <p className="text-sm text-gray-600">
                Automatic flight detection, travel blocks, and timezone management
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="text-3xl mb-3">🤝</div>
              <h3 className="font-semibold text-gray-900 mb-2">Team Scheduling</h3>
              <p className="text-sm text-gray-600">
                Find optimal meeting times across multiple calendars instantly
              </p>
            </div>
          </div>

          {/* Connect Button */}
          <div className="space-y-4">
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5zm-7 14H11v-1.5h1.5V17zm0-3H11V9h1.5v5zm6 3h-1.5v-1.5H18V17zm0-3h-1.5V9H18v5z" />
              </svg>
              Connect Google Calendar
            </button>

            <p className="text-sm text-gray-500">
              We'll securely access your calendar to provide intelligent insights and automation
            </p>
          </div>

          {/* Security Note */}
          <div className="mt-12 bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="text-2xl mt-1">🔒</div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 mb-2">Your Privacy Matters</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Your calendar data stays secure and is never shared</li>
                  <li>• We use OAuth 2.0 with industry-standard encryption</li>
                  <li>• You can revoke access anytime from your Google Account settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarConnectPrompt;
