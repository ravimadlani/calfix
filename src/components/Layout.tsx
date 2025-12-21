/**
 * Layout Component
 * Provides consistent navigation and structure across all pages
 */

import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isSignedIn, user } = useUser();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Handle scrolling to anchors when navigating to homepage with hash
  useEffect(() => {
    if (location.hash) {
      const elementId = location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Scroll to top when no hash
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/cz_logo.png" alt="CalendarZero" className="h-11" />
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              {isSignedIn ? (
                <>
                  {/* App Navigation - Darker/Bold */}
                  <Link
                    to="/dashboard"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/dashboard')
                        ? 'text-indigo-600 underline decoration-2 underline-offset-4'
                        : 'text-gray-900 hover:text-indigo-600'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/recurring"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/recurring')
                        ? 'text-indigo-600 underline decoration-2 underline-offset-4'
                        : 'text-gray-900 hover:text-indigo-600'
                    }`}
                  >
                    Recurring
                  </Link>
                  <Link
                    to="/schedule"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/schedule')
                        ? 'text-indigo-600 underline decoration-2 underline-offset-4'
                        : 'text-gray-900 hover:text-indigo-600'
                    }`}
                  >
                    Schedule
                  </Link>
                  <Link
                    to="/settings"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/settings')
                        ? 'text-indigo-600 underline decoration-2 underline-offset-4'
                        : 'text-gray-900 hover:text-indigo-600'
                    }`}
                  >
                    Settings
                  </Link>

                  {/* Visual Separator */}
                  <span className="text-gray-400">•</span>

                  {/* Marketing Links - Lighter */}
                  {location.pathname === '/' ? (
                    <a
                      href="#features"
                      className={`text-sm font-light transition-colors ${
                        location.hash === '#features'
                          ? 'text-blue-600 underline decoration-2 underline-offset-4'
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      Features
                    </a>
                  ) : (
                    <Link
                      to="/#features"
                      className="text-sm font-light text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Features
                    </Link>
                  )}
                  {location.pathname === '/' ? (
                    <a
                      href="#pricing"
                      className={`text-sm font-light transition-colors ${
                        location.hash === '#pricing'
                          ? 'text-blue-600 underline decoration-2 underline-offset-4'
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      Pricing
                    </a>
                  ) : (
                    <Link
                      to="/#pricing"
                      className="text-sm font-light text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Pricing
                    </Link>
                  )}
                  {location.pathname === '/' ? (
                    <a
                      href="#resources"
                      className={`text-sm font-light transition-colors ${
                        location.hash === '#resources'
                          ? 'text-blue-600 underline decoration-2 underline-offset-4'
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      Resources
                    </a>
                  ) : (
                    <Link
                      to="/#resources"
                      className="text-sm font-light text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Resources
                    </Link>
                  )}
                </>
              ) : (
                <>
                  {/* Pre-login: Marketing Links Only */}
                  {location.pathname === '/' ? (
                    <a
                      href="#features"
                      className={`text-sm font-light transition-colors ${
                        location.hash === '#features'
                          ? 'text-blue-600 underline decoration-2 underline-offset-4'
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      Features
                    </a>
                  ) : (
                    <Link
                      to="/#features"
                      className="text-sm font-light text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Features
                    </Link>
                  )}
                  {location.pathname === '/' ? (
                    <a
                      href="#pricing"
                      className={`text-sm font-light transition-colors ${
                        location.hash === '#pricing'
                          ? 'text-blue-600 underline decoration-2 underline-offset-4'
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      Pricing
                    </a>
                  ) : (
                    <Link
                      to="/#pricing"
                      className="text-sm font-light text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Pricing
                    </Link>
                  )}
                  {location.pathname === '/' ? (
                    <a
                      href="#resources"
                      className={`text-sm font-light transition-colors ${
                        location.hash === '#resources'
                          ? 'text-blue-600 underline decoration-2 underline-offset-4'
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      Resources
                    </a>
                  ) : (
                    <Link
                      to="/#resources"
                      className="text-sm font-light text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Resources
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* User Menu / Auth Buttons */}
            <div className="flex items-center gap-4">
              {isSignedIn ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.emailAddresses[0]?.emailAddress}
                    </p>
                  </div>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: 'w-10 h-10'
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/sign-in"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/sign-up"
                    className="px-4 py-2 text-sm font-light text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all transform hover:scale-105"
                  >
                    Try the App
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <div className="mb-4">
                <img src="/cz_logo.png" alt="CalendarZero" className="h-9" />
              </div>
              <p className="text-sm text-blue-500 font-light">
                Intelligent calendar management for executive assistants and professionals.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/recurring" className="text-sm text-gray-600 hover:text-indigo-600">
                    Recurring
                  </Link>
                </li>
                <li>
                  <Link to="/schedule" className="text-sm text-gray-600 hover:text-indigo-600">
                    Schedule
                  </Link>
                </li>
                <li>
                  {location.pathname === '/' ? (
                    <a href="#features" className="text-sm text-gray-600 hover:text-indigo-600">
                      Features
                    </a>
                  ) : (
                    <Link to="/#features" className="text-sm text-gray-600 hover:text-indigo-600">
                      Features
                    </Link>
                  )}
                </li>
                <li>
                  {location.pathname === '/' ? (
                    <a href="#pricing" className="text-sm text-gray-600 hover:text-indigo-600">
                      Pricing
                    </a>
                  ) : (
                    <Link to="/#pricing" className="text-sm text-gray-600 hover:text-indigo-600">
                      Pricing
                    </Link>
                  )}
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:hello@calendarzero.com" className="text-sm text-gray-600 hover:text-indigo-600">
                    Contact
                  </a>
                </li>
                <li>
                  <Link to="/privacy" className="text-sm text-gray-600 hover:text-indigo-600">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-sm text-gray-600 hover:text-indigo-600">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Connect</h3>
              <p className="text-sm text-gray-600">
                Questions? Email us at{' '}
                <a href="mailto:hello@calendarzero.com" className="text-indigo-600 hover:underline">
                  hello@calendarzero.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-blue-500 font-light">
              © {new Date().getFullYear()} CalendarZero.com. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
