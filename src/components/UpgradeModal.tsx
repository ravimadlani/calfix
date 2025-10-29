/**
 * UpgradeModal Component
 * Shows pricing tiers and allows users to upgrade their subscription
 */

import React, { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: 'basic' | 'ea' | 'ea_pro';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentTier = 'basic' }) => {
  const [selectedTier, setSelectedTier] = useState<'basic' | 'ea' | 'ea_pro'>('ea');

  if (!isOpen) return null;

  const tiers = [
    {
      id: 'basic',
      name: 'Basic',
      icon: '📅',
      price: 9,
      calendars: 1,
      description: 'Perfect for individual professionals',
      features: [
        'Manage 1 calendar',
        'Calendar health scoring',
        'Smart automation',
        'Conflict detection',
        'Analytics & insights',
        'Buffer management',
        'Focus time tracking'
      ],
      color: 'from-gray-600 to-gray-700',
      highlight: false
    },
    {
      id: 'ea',
      name: 'EA',
      icon: '👔',
      price: 19,
      calendars: 5,
      description: 'For executive assistants',
      features: [
        'Manage up to 5 calendars',
        'Everything in Basic',
        'Multi-calendar dashboard',
        'Delegate access support',
        'Team scheduling',
        'Priority email support'
      ],
      color: 'from-indigo-600 to-purple-600',
      highlight: true
    },
    {
      id: 'ea_pro',
      name: 'EA Pro',
      icon: '🚀',
      price: 39,
      calendars: 15,
      description: 'For senior EAs & teams',
      features: [
        'Manage up to 15 calendars',
        'Everything in EA',
        'Advanced automation',
        'Custom workflows',
        'Priority support',
        'Onboarding assistance'
      ],
      color: 'from-purple-600 to-pink-600',
      highlight: false
    }
  ];

  const handleSelectPlan = (tierId: string) => {
    // TODO: Implement Stripe checkout
    alert(`Stripe integration coming soon!\n\nSelected: ${tierId.toUpperCase()}\n\nFor now, contact ravi@madlanilabs.com`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
          <p className="text-gray-600">
            7-day free trial on all plans • Cancel anytime
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative border-2 rounded-xl p-6 transition-all ${
                tier.highlight
                  ? 'border-indigo-500 shadow-xl scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="text-4xl mb-2">{tier.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{tier.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{tier.calendars} calendar{tier.calendars > 1 ? 's' : ''}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(tier.id)}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                  tier.highlight
                    ? `bg-gradient-to-r ${tier.color} text-white shadow-lg`
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                Start Free Trial
              </button>
            </div>
          ))}
        </div>

        {/* Key Features Banner */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">All Plans Include:</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm font-medium text-gray-900">Smart Automation</p>
              <p className="text-xs text-gray-600">Auto-add buffers & blocks</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🌍</div>
              <p className="text-sm font-medium text-gray-900">Timezone Tracking</p>
              <p className="text-xs text-gray-600">Multi-timezone support</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">✈️</div>
              <p className="text-sm font-medium text-gray-900">Travel Detection</p>
              <p className="text-xs text-gray-600">Flight & location tracking</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-sm font-medium text-gray-900">Health Analytics</p>
              <p className="text-xs text-gray-600">Calendar insights & scoring</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          All plans include 7-day free trial • No credit card required • Cancel anytime
        </p>
      </div>
    </div>
  );
};

export default UpgradeModal;
