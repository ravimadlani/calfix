/**
 * App Component
 * Root component that handles authentication and routing
 */

import { useState, useEffect } from 'react';
import AuthButton from './components/AuthButton';
import CalendarDashboard from './components/CalendarDashboard';
import { signIn, signOut, isAuthenticated, handleCallback } from './services/googleAuth';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = () => {
      setAuthenticated(isAuthenticated());
      setLoading(false);
    };

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setAuthError(`Authentication error: ${error}`);
      setLoading(false);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      // Exchange code for tokens
      handleCallback(code)
        .then(() => {
          setAuthenticated(true);
          setLoading(false);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(err => {
          console.error('Callback error:', err);
          setAuthError(err.message || 'Authentication failed');
          setLoading(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else {
      checkAuth();
    }
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signIn();
    } catch (err) {
      console.error('Sign in error:', err);
      setAuthError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label="Calendar">
                📅
              </span>
              <h1 className="text-2xl font-bold text-gray-900">
                Calendar Dashboard
              </h1>
            </div>
            <AuthButton
              isAuthenticated={authenticated}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              loading={loading}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {authError && (
          <div className="max-w-7xl mx-auto px-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl" role="img" aria-label="Error">
                ⚠️
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Authentication Error</h3>
                <p className="text-red-700 text-sm mt-1">{authError}</p>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {authenticated ? (
          <CalendarDashboard />
        ) : (
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
              <span className="text-8xl block mb-6" role="img" aria-label="Calendar">
                📅
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Calendar Dashboard
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Intelligent calendar analytics and smart scheduling for productive professionals
              </p>

              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4 text-left max-w-2xl mx-auto">
                  <span className="text-3xl flex-shrink-0" role="img" aria-label="Check">
                    ✅
                  </span>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Calendar Health Analytics</h3>
                    <p className="text-gray-600">Track back-to-back meetings, focus blocks, and overall calendar health</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-left max-w-2xl mx-auto">
                  <span className="text-3xl flex-shrink-0" role="img" aria-label="Check">
                    ✅
                  </span>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Smart Insights & Recommendations</h3>
                    <p className="text-gray-600">Get actionable advice to optimize your schedule and reduce burnout</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-left max-w-2xl mx-auto">
                  <span className="text-3xl flex-shrink-0" role="img" aria-label="Check">
                    ✅
                  </span>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">One-Click Optimizations</h3>
                    <p className="text-gray-600">Add buffers, schedule focus time, and optimize your calendar instantly</p>
                  </div>
                </div>
              </div>

              <AuthButton
                isAuthenticated={false}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                loading={loading}
              />

              <p className="mt-6 text-sm text-gray-500">
                Sign in with your Google account to get started. We only request calendar access.
              </p>

              {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">
                    ⚠️ Configuration Required
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please set up your Google OAuth Client ID in the .env file. See README for instructions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>
            Built with React, Tailwind CSS, and Google Calendar API
          </p>
          <p className="mt-1">
            Your calendar data is never stored on our servers
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
