/**
 * LandingPage Component
 * Homepage with hero, features, and pricing
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

const LandingPage: React.FC = () => {
  const { isSignedIn } = useUser();

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-blue-600 mb-4">
                Zero Calendar Conflicts. Zero Scheduling Stress.
              </h1>
              <p className="text-sm sm:text-base text-blue-600 font-light mb-4 leading-relaxed">
                Just like Inbox Zero transformed email management, Calendar Zero brings that same clarity to your schedule.
                A clean, conflict-free calendar where every meeting has purpose, every executive has adequate buffer time,
                and nothing slips through the cracks.
              </p>

              {/* Key Features */}
              <div className="mb-5">
                <h3 className="text-base font-medium text-blue-600 mb-3 text-center lg:text-left">Smart Calendar Intelligence</h3>
                <ul className="space-y-1.5 max-w-xl">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-600 font-light">Automatic conflict detection and resolution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-600 font-light">Intelligent travel time management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-600 font-light">Multi-timezone coordination</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-600 font-light">One-click schedule optimization</span>
                  </li>
                </ul>
              </div>

              {/* Platform Support Badges */}
              <div className="mt-5">
                <p className="text-xs text-blue-500 font-light mb-2 text-center lg:text-left">Works seamlessly with:</p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-blue-200 hover:shadow-lg transition-shadow">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Google Calendar</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-blue-200 hover:shadow-lg transition-shadow">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12 12-5.373 12-12S18.628 0 12 0z" fill="#0078D4"/>
                      <path d="M18.5 8h-13c-.825 0-1.5.675-1.5 1.5v5c0 .825.675 1.5 1.5 1.5h13c.825 0 1.5-.675 1.5-1.5v-5c0-.825-.675-1.5-1.5-1.5zm-.5 6.5H6v-5h12v5z" fill="white"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Microsoft Outlook</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-blue-400 font-light mt-3">7-day free trial • No credit card required</p>
            </div>

            {/* Right side - Demo Video */}
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-2xl flex items-center justify-center border-4 border-white">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎥</div>
                  <p className="text-gray-600 font-semibold">Demo Video</p>
                  <p className="text-sm text-gray-500 mt-2">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-light text-blue-600 mb-3">
              Intelligent Calendar Automation
            </h2>
            <p className="text-lg text-blue-500 font-light">
              Stop constantly firefighting scheduling issues—achieve Calendar Zero.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-light text-blue-600 mb-2">Smart Detection</h3>
              <p className="text-sm text-blue-500 font-light">
                Automatically detects back-to-back meetings, double bookings, flights without travel blocks, and out-of-hours meetings.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-light text-blue-600 mb-2">One-Click Fixes</h3>
              <p className="text-sm text-blue-500 font-light">
                Fix all issues with one click. Add buffers, create travel blocks, decline conflicts, and optimize schedules instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="text-lg font-light text-blue-600 mb-2">Multi-Calendar Management</h3>
              <p className="text-sm text-blue-500 font-light">
                Manage up to 15 executive calendars from one dashboard. Perfect for EAs supporting multiple executives.
              </p>
            </div>

            {/* Feature 4 - Travel & Timezone */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-3xl mb-3">🌍✈️</div>
              <h3 className="text-lg font-light text-blue-600 mb-2">Travel & Timezone Intelligence</h3>
              <p className="text-sm text-blue-500 font-light">
                Track executives across timezones, detect international flights, and automatically create travel blocks and location tracking events.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-light text-blue-600 mb-2">Health Analytics</h3>
              <p className="text-sm text-blue-500 font-light">
                Get daily calendar health scores, insights, and recommendations to optimize your executive's schedule.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="text-lg font-light text-blue-600 mb-2">Seamless Integration</h3>
              <p className="text-sm text-blue-500 font-light">
                Native support for Google Calendar and Microsoft Outlook. Connect in seconds and start optimizing immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-blue-600 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-blue-500 font-light">
              Start with a 7-day free trial. Upgrade anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">📅</div>
                <h3 className="text-2xl font-light text-blue-600 mb-2">Basic</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-light text-blue-600">$9</span>
                  <span className="text-blue-500 font-light">/month</span>
                </div>
                <p className="text-sm text-blue-500 font-light">1 calendar</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-500 font-light">All features included</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-500 font-light">Smart automation</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-500 font-light">Email support</span>
                </li>
              </ul>
              <Link
                to="/sign-up"
                className="block w-full py-3 text-center font-light text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors"
              >
                Try the App
              </Link>
            </div>

            {/* EA Plan - Most Popular */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 border-2 border-blue-600 shadow-2xl transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-white text-blue-600 text-xs font-light px-4 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">👔</div>
                <h3 className="text-2xl font-light text-white mb-2">EA</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-light text-white">$19</span>
                  <span className="text-blue-100 font-light">/month</span>
                </div>
                <p className="text-sm text-blue-100 font-light">Up to 5 calendars</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-200 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-white font-light">Everything in Basic</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-200 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-white font-light">Multi-calendar dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-200 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-white font-light">Priority support</span>
                </li>
              </ul>
              <Link
                to="/sign-up"
                className="block w-full py-3 text-center font-light text-blue-600 bg-white hover:bg-gray-50 rounded-lg transition-colors"
              >
                Try the App
              </Link>
            </div>

            {/* EA Pro Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="text-2xl font-light text-blue-600 mb-2">EA Pro</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-light text-blue-600">$39</span>
                  <span className="text-blue-500 font-light">/month</span>
                </div>
                <p className="text-sm text-blue-500 font-light">Up to 15 calendars</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-500 font-light">Everything in EA</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-500 font-light">Advanced automation</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-500 font-light">Onboarding assistance</span>
                </li>
              </ul>
              <Link
                to="/sign-up"
                className="block w-full py-3 text-center font-light text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors"
              >
                Try the App
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section id="resources" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-blue-600 mb-4">
              Resources
            </h2>
            <p className="text-xl text-blue-500 font-light">
              Documentation, guides, and support to help you get the most out of CalendarZero.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-light text-white mb-4">
            Ready to fix your calendars?
          </h2>
          <p className="text-xl text-blue-100 font-light mb-8">
            Join executive assistants who save hours every week with CalendarZero.
          </p>
          <Link
            to="/sign-up"
            className="inline-block px-8 py-4 text-lg font-light text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Try the App - No Credit Card Required
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
