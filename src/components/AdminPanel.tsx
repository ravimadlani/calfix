/**
 * AdminPanel Component
 * Admin dashboard for managing users and generating test data
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { generateTestCalendarData } from '../services/testDataGenerator';
import { useCalendarProvider } from '../context/CalendarProviderContext';

interface User {
  id: string;
  email: string;
  subscription_tier: string;
  created_at: string;
  updated_at?: string;
}

const AdminPanel = () => {
  const { user: clerkUser } = useUser();
  const {
    activeProvider,
    activeProviderId,
    signIn,
    isAuthenticated
  } = useCalendarProvider();
  const providerLabel = activeProvider.label;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  // Check if user is admin (you can customize this logic)
  const isAdmin = clerkUser?.primaryEmailAddress?.emailAddress === 'ravi@calfix.pro';

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Call admin API endpoint with admin email header
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'x-admin-email': clerkUser?.primaryEmailAddress?.emailAddress || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load users: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [clerkUser?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    if (isAdmin && clerkUser) {
      loadUsers();
      setIsCalendarConnected(isAuthenticated(activeProviderId));
    }
  }, [activeProviderId, isAdmin, clerkUser, isAuthenticated, loadUsers]);

  const handleGenerateTestData = async () => {
    // First check if provider calendar is connected
    if (!isCalendarConnected) {
      setError(`Please connect your ${providerLabel} calendar first to generate test data.`);
      return;
    }

    if (!window.confirm('This will create 2 months of test calendar events. Continue?')) {
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await generateTestCalendarData();
      setSuccessMessage(`Successfully created ${result.totalEvents} test events!`);

      // Show breakdown
      alert(`Test Data Created:\n\n` +
        `• ${result.backToBack} back-to-back meetings\n` +
        `• ${result.insufficientBuffer} meetings with insufficient buffers\n` +
        `• ${result.doubleBookings} double bookings\n` +
        `• ${result.flights} flights without travel blocks\n` +
        `• ${result.internationalFlights} international flights without location\n` +
        `• ${result.outOfHours} out-of-hours meetings\n` +
        `• ${result.noVideoLink} meetings without video links\n` +
        `• ${result.declinedMeetings} declined meetings\n` +
        `• ${result.focusBlocks} focus time blocks\n` +
        `• ${result.regularMeetings} regular meetings`);
    } catch (err: unknown) {
      console.error('Test data generation error:', err);
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('401') || message.includes('unauthenticated') || message.includes('unauthorized')) {
        setError(`${providerLabel} authentication expired. Please reconnect your calendar.`);
        setIsCalendarConnected(false);
      } else if (message.includes('403') || message.includes('Permission denied')) {
        setError(`Permission denied: Your ${providerLabel} connection doesn't have write permissions. Please reconnect with proper permissions.`);
      } else {
        setError(`Failed to generate test data: ${message}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      await signIn(activeProviderId);
      setIsCalendarConnected(true);
      setError(null);
      setSuccessMessage(`${providerLabel} connected successfully!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to connect ${providerLabel}: ${message}`);
    }
  };

  const handleReconnectCalendar = async () => {
    try {
      await activeProvider.auth.forceReauthentication();
      // Note: The page will redirect, so these won't execute
      setIsCalendarConnected(true);
      setError(null);
      setSuccessMessage(`Reconnecting to ${providerLabel} with proper permissions...`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to reconnect ${providerLabel}: ${message}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <span className="text-4xl block mb-3">🚫</span>
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-1">Manage users and test data</p>
        </div>
        <a
          href="/dashboard"
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          ← Back to Dashboard
        </a>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-medium">{error}</p>
          {error.includes('Permission denied') && (
            <button
              onClick={handleReconnectCalendar}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Reconnect with Proper Permissions
            </button>
          )}
        </div>
      )}

      {/* Test Data Generator */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🧪 Test Data Generator</h2>

            {/* Calendar Connection Status */}
            {!isCalendarConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 mb-3">
                  ⚠️ {providerLabel} is not connected. Connect it first to generate test data.
                </p>
                <button
                  onClick={handleConnectCalendar}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
                >
                  Connect {providerLabel}
                </button>
              </div>
            )}

            {isCalendarConnected && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 inline-block">
                <p className="text-green-800 text-sm">✅ {providerLabel} connected</p>
              </div>
            )}

            <p className="text-gray-700 mb-4">
              Generate 2 months of realistic calendar events with various issues that CalFix can detect:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>• Back-to-back meetings (no buffers)</li>
              <li>• Insufficient buffers (&lt;10 minutes)</li>
              <li>• Double bookings (overlapping events)</li>
              <li>• Flights without travel blocks</li>
              <li>• International flights without location tracking</li>
              <li>• Out-of-hours meetings (while traveling)</li>
              <li>• Meetings without video links</li>
              <li>• Declined meetings (to be removed)</li>
              <li>• Focus time blocks (good examples)</li>
              <li>• Regular meetings with proper spacing</li>
            </ul>
            <button
              onClick={handleGenerateTestData}
              disabled={generating || !isCalendarConnected}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating Test Data...' : 'Generate Test Calendar Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">👥 Users</h2>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Subscription</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">User ID</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{user.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          user.subscription_tier === 'pro'
                            ? 'bg-purple-100 text-purple-800'
                            : user.subscription_tier === 'premium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.subscription_tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs font-mono">{user.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Free Tier</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter((u) => u.subscription_tier === 'free').length}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Pro/Premium</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter((u) => u.subscription_tier === 'pro' || u.subscription_tier === 'premium').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
