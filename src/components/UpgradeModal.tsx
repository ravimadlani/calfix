/**
 * UpgradeModal Component
 * Prompts free tier users to upgrade to EA tier for calendar management features
 */

import React from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Upgrade to EA Mode</h2>
          <p className="text-gray-600">
            Unlock powerful calendar management features for executive assistants
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl">👥</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Manage Up to 5 Calendars</h3>
              <p className="text-sm text-gray-600">
                Manage multiple executive calendars from one dashboard with full delegate access
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Advanced Automation</h3>
              <p className="text-sm text-gray-600">
                Auto-add buffers, auto-decline conflicts, and intelligent scheduling across all managed calendars
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl">🌍</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Multi-Timezone Support</h3>
              <p className="text-sm text-gray-600">
                Track executives across timezones with automatic out-of-hours detection
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
            <div className="text-2xl">✈️</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Travel Management</h3>
              <p className="text-sm text-gray-600">
                Automatic travel block creation, flight detection, and location tracking
              </p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-indigo-100 text-sm mb-1">EA Mode</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-indigo-100">/month</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-100">7-day free trial</p>
              <p className="text-xs text-indigo-200">Cancel anytime</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              // TODO: Implement Stripe checkout
              alert('Stripe integration coming soon! For now, contact ravi@madlanilabs.com');
            }}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
          >
            Start Free Trial
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          No credit card required for trial • Upgrade or downgrade anytime
        </p>
      </div>
    </div>
  );
};

export default UpgradeModal;
