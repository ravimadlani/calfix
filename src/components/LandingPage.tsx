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
      {/* Hero Section / Product Section */}
      <section id="product" className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="text-center lg:text-left">
              <div className="text-6xl mb-6 animate-bounce lg:inline-block">📅</div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light text-blue-600 mb-6">
                CalendarZero
              </h1>
              <p className="text-xl sm:text-2xl text-blue-500 font-light mb-8">
                CalendarZero automatically detects issues, optimizes schedules, and saves executive assistants hours every week.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center items-center">
                {isSignedIn ? (
                  <Link
                    to="/dashboard"
                    className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/sign-up"
                      className="px-8 py-4 text-lg font-light text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                    >
                      Try the App
                    </Link>
                    <Link
                      to="/sign-in"
                      className="px-8 py-4 text-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl transition-colors border-2 border-gray-200"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
              <p className="text-sm text-blue-400 font-light mt-4">7-day free trial • No credit card required</p>
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
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-blue-600 mb-4">
              Intelligent Calendar Automation
            </h2>
            <p className="text-xl text-blue-500 font-light">
              Stop firefighting calendar issues. Let CalendarZero handle it automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-light text-blue-600 mb-3">Smart Detection</h3>
              <p className="text-blue-500 font-light">
                Automatically detects back-to-back meetings, double bookings, flights without travel blocks, and out-of-hours meetings.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-light text-blue-600 mb-3">One-Click Fixes</h3>
              <p className="text-blue-500 font-light">
                Fix all issues with one click. Add buffers, create travel blocks, decline conflicts, and optimize schedules instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-light text-blue-600 mb-3">Multi-Calendar Management</h3>
              <p className="text-blue-500 font-light">
                Manage up to 15 executive calendars from one dashboard. Perfect for EAs supporting multiple executives.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-light text-blue-600 mb-3">Timezone Intelligence</h3>
              <p className="text-blue-500 font-light">
                Track executives across timezones. Automatically detect out-of-hours meetings in foreign locations.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">✈️</div>
              <h3 className="text-xl font-light text-blue-600 mb-3">Travel Detection</h3>
              <p className="text-blue-500 font-light">
                Automatically finds international flights, suggests travel blocks, and creates location tracking events.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-light text-blue-600 mb-3">Health Analytics</h3>
              <p className="text-blue-500 font-light">
                Get daily calendar health scores, insights, and recommendations to optimize your executive's schedule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Applications Section */}
      <section id="applications" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-blue-600 mb-4">
              Applications
            </h2>
            <p className="text-xl text-blue-500 font-light mb-12">
              Built for Every Scenario
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Executive Assistant */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">👔</div>
              <h3 className="text-2xl font-light text-blue-600 mb-3">Executive Assistant</h3>
              <p className="text-blue-500 font-light">
                Manage multiple executive calendars effortlessly. Detect conflicts, optimize schedules, and ensure seamless coordination across time zones.
              </p>
            </div>

            {/* Office Manager */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-2xl font-light text-blue-600 mb-3">Office Manager</h3>
              <p className="text-blue-500 font-light">
                Coordinate team schedules, meeting rooms, and resources. Keep everyone on track with automated conflict detection and smart scheduling.
              </p>
            </div>

            {/* Busy Professional */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-2xl font-light text-blue-600 mb-3">Busy Professional</h3>
              <p className="text-blue-500 font-light">
                Take control of your own schedule. Automatically add buffers between meetings, manage travel time, and maintain work-life balance.
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
