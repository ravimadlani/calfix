/**
 * LandingPage Component
 * Homepage with hero, features, and pricing
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUser, Waitlist } from '@clerk/clerk-react';
import outlookLogo from '../assets/outlook-calendar.jpg';

const LandingPage: React.FC = () => {
  const { isSignedIn } = useUser();
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for ?waitlist=true query param (from header link)
  useEffect(() => {
    if (searchParams.get('waitlist') === 'true') {
      setShowWaitlist(true);
      // Clear the query param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-blue-600 mb-4">
                Stop Firefighting.<br />Start Managing.
              </h1>
              <p className="text-sm sm:text-base text-blue-600 font-light mb-4 leading-relaxed">
                AI-powered calendar management for Executive Assistants who manage the impossible.
                Spot conflicts. Fix them automatically. Finally breathe.
              </p>

              {/* Key Features */}
              <div className="mb-5">
                <h3 className="text-base font-medium text-blue-600 mb-3 text-center lg:text-left">Built for EAs Managing 1-15 Calendars</h3>
                <ul className="space-y-1.5 max-w-xl">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-600 font-light">Catch double-bookings before your exec does</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-600 font-light">Auto-add travel time between meetings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-600 font-light">Flag out-of-hours meetings instantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-600 font-light">Fix a chaotic week in one click</span>
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
                    <img src={outlookLogo} alt="Microsoft Outlook" className="w-5 h-5 object-contain" />
                    <span className="text-sm font-medium text-gray-700">Microsoft Outlook</span>
                  </div>
                </div>
              </div>

              {/* Waitlist CTA */}
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start relative z-10">
                <button
                  type="button"
                  onClick={() => setShowWaitlist(true)}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer"
                >
                  Join the Waitlist
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-blue-400 font-light mt-3">Limited early access • Be first in line</p>
            </div>

            {/* Right side - Alert Cards Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-lg">🚨</span>
                      <span className="text-white font-medium">4 Issues Need Attention</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">72%</div>
                      <div className="text-blue-100 text-xs">Health Score</div>
                    </div>
                  </div>
                </div>

                {/* Alert Cards */}
                <div className="p-4 space-y-3">
                  {/* Double Booking - Critical */}
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200 transform hover:scale-[1.02] transition-transform">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-900">Double Booking</p>
                      <p className="text-xs text-red-600 truncate">Board Meeting vs 1:1 @ 2pm</p>
                    </div>
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">Critical</span>
                  </div>

                  {/* Back-to-Back */}
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-200 transform hover:scale-[1.02] transition-transform">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">🔄</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-orange-900">Back-to-Back Meetings</p>
                      <p className="text-xs text-orange-600">5 meetings with no break</p>
                    </div>
                    <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">5 issues</span>
                  </div>

                  {/* Flight Missing Travel Block */}
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200 transform hover:scale-[1.02] transition-transform">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">✈️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-purple-900">Flight Needs Travel Block</p>
                      <p className="text-xs text-purple-600 truncate">LHR → JFK missing buffer</p>
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">1 flight</span>
                  </div>

                  {/* Out of Hours */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200 transform hover:scale-[1.02] transition-transform">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">🌙</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900">Out of Hours Meeting</p>
                      <p className="text-xs text-blue-600">6am in Tokyo timezone</p>
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">1 meeting</span>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-4 pb-4">
                  <button className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                    Fix All Issues
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Decorative floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-red-400 rounded-full opacity-20 blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-400 rounded-full opacity-20 blur-2xl"></div>
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
              <h3 className="text-lg font-light text-blue-600 mb-2">Intelligent Actions</h3>
              <p className="text-sm text-blue-500 font-light">
                Take smart action on issues. Add buffers, create travel blocks, decline conflicts, and optimize schedules with AI-powered suggestions.
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
              <button
                onClick={() => setShowWaitlist(true)}
                className="block w-full py-3 text-center font-light text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors"
              >
                Join Waitlist
              </button>
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
              <button
                onClick={() => setShowWaitlist(true)}
                className="block w-full py-3 text-center font-light text-blue-600 bg-white hover:bg-gray-50 rounded-lg transition-colors"
              >
                Join Waitlist
              </button>
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
              <button
                onClick={() => setShowWaitlist(true)}
                className="block w-full py-3 text-center font-light text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors"
              >
                Join Waitlist
              </button>
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
            Be First in Line
          </h2>
          <p className="text-xl text-blue-100 font-light mb-8">
            Join the waitlist for early access. Limited spots available.
          </p>
          <button
            onClick={() => setShowWaitlist(true)}
            className="inline-block px-8 py-4 text-lg font-light text-blue-600 bg-white hover:bg-gray-50 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Join the Waitlist
          </button>
        </div>
      </section>

      {/* Waitlist Modal */}
      {showWaitlist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowWaitlist(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Close button in top right corner */}
            <button
              onClick={() => setShowWaitlist(false)}
              className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Clerk Waitlist component wrapper with padding */}
            <div className="pt-10 pb-6 px-6">
              <Waitlist />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
