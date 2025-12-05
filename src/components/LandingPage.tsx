/**
 * LandingPage Component
 * Homepage with hero, features, and pricing
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import outlookLogo from '../assets/outlook-calendar.jpg';

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
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-600 mb-6 leading-tight">
                Zero Calendar Conflicts.<br />Zero Scheduling Stress.
              </h1>
              <p className="text-lg sm:text-xl text-blue-600 font-light mb-8 leading-relaxed max-w-2xl">
                Save 5+ hours every week managing executive calendars with AI-powered automation.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-6">
                <Link
                  to="/sign-up"
                  className="px-8 py-4 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Free Trial
                </Link>
              </div>

              <p className="text-sm text-blue-500 font-light">7-day free trial • No credit card required</p>
            </div>

            {/* Right side - Product Preview */}
            <div className="relative">
              <div className="aspect-video rounded-2xl shadow-2xl overflow-hidden border border-blue-200 bg-gradient-to-br from-white via-blue-50 to-indigo-50 flex items-center justify-center">
                {/* Product screenshot placeholder */}
                <div className="text-center p-8">
                  <div className="mb-4">
                    <svg className="w-24 h-24 mx-auto text-blue-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-blue-600 font-medium text-lg">Dashboard Preview</p>
                  <p className="text-blue-500 text-sm mt-2">See all your calendars at a glance</p>
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

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-blue-600 mb-4">
              Loved by Executive Assistants
            </h2>
            <p className="text-xl text-blue-500 font-light">
              See how CalendarZero helps EAs manage executive schedules effortlessly
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
                  S
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">Sarah Chen</p>
                  <p className="text-sm text-gray-600">EA to CEO, Tech Startup</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "CalendarZero saves me at least 6 hours every week. I used to spend my mornings fixing scheduling conflicts—now I just review and approve the suggested fixes. It's like having an assistant for the assistant."
              </p>
              <div className="flex text-yellow-400">
                ⭐⭐⭐⭐⭐
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                  M
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">Maria Rodriguez</p>
                  <p className="text-sm text-gray-600">Executive Assistant, Fortune 500</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "Managing 3 executive calendars used to be overwhelming. CalendarZero catches conflicts I would have missed and automatically adds travel time between offices. My executives are happier and less stressed."
              </p>
              <div className="flex text-yellow-400">
                ⭐⭐⭐⭐⭐
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xl">
                  J
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">James Williams</p>
                  <p className="text-sm text-gray-600">Chief of Staff, Investment Firm</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "The timezone intelligence is a game-changer. Our CEO travels constantly, and CalendarZero automatically adjusts meeting times and flags potential issues. I finally feel like I'm ahead of problems, not reacting to them."
              </p>
              <div className="flex text-yellow-400">
                ⭐⭐⭐⭐⭐
              </div>
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
