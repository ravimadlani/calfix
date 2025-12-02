/**
 * HealthScoreHero Component
 * Displays calendar health score with expandable factor breakdown
 * Replaces the traditional stats grid to provide holistic health view
 */

import React, { useState } from 'react';
import type { CalendarAnalytics } from '../types/analytics';
import type { HealthScoreResult } from '../services/healthScoreTrackerSecure';
import { getHealthScoreInterpretation } from '../utils/healthCalculator';

interface HealthScoreHeroProps {
  analytics: CalendarAnalytics;
  healthScoreResult?: HealthScoreResult | null;
  isCalculating?: boolean;
}

const HealthScoreHero: React.FC<HealthScoreHeroProps> = ({ analytics, healthScoreResult, isCalculating = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUnsnoozed, setShowUnsnoozed] = useState(false);

  const {
    backToBackCount,
    insufficientBufferCount,
    focusBlockCount,
    outOfHoursMeetingCount,
    doubleBookingCount,
  } = analytics;

  // Use health score from healthScoreResult (no fallback - wait for async calculation)
  const healthScore = healthScoreResult?.actualScore ?? null;
  const healthInterpretation = healthScore !== null ? getHealthScoreInterpretation(healthScore) : {
    label: 'Calculating...' as const,
    color: 'blue' as const,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    message: 'Calculating your health score...'
  };

  // Helper function to get impact from healthScoreResult breakdowns
  const getImpactFromBreakdown = (factorCode: string, fallbackImpact: number) => {
    if (!healthScoreResult?.breakdowns) return fallbackImpact;
    const breakdown = healthScoreResult.breakdowns.find(b => b.factorCode === factorCode);
    return breakdown ? breakdown.totalImpact : fallbackImpact;
  };

  // Use impacts from health score calculation if available, otherwise fall back to local calculation
  const backToBackImpact = getImpactFromBreakdown('back_to_back', backToBackCount * -15);
  const insufficientBufferImpact = getImpactFromBreakdown('insufficient_buffer', insufficientBufferCount * -8);
  const focusBlockImpact = getImpactFromBreakdown('focus_block', Math.min(focusBlockCount, 5) * 8);
  const doubleBookingImpact = getImpactFromBreakdown('double_booking', doubleBookingCount * -20);
  const outOfHoursImpact = getImpactFromBreakdown('out_of_hours', outOfHoursMeetingCount * -10);

  // Active factors (non-zero values or impacts)
  const activeFactors = [
    {
      label: 'Back-to-Back',
      value: backToBackCount,
      impact: backToBackImpact,
      subtext: 'meetings',
      borderColor: 'border-red-200',
      impactColor: 'text-red-600',
      isActive: backToBackCount > 0
    },
    {
      label: 'Short Buffers',
      value: insufficientBufferCount,
      impact: insufficientBufferImpact,
      subtext: 'occurrences',
      borderColor: 'border-orange-200',
      impactColor: 'text-orange-600',
      isActive: insufficientBufferCount > 0
    },
    {
      label: 'Focus Blocks',
      value: focusBlockCount,
      impact: focusBlockImpact,
      subtext: 'blocks',
      borderColor: 'border-green-200',
      impactColor: 'text-green-600',
      isActive: focusBlockCount > 0
    },
    {
      label: 'Out of Hours',
      value: outOfHoursMeetingCount,
      impact: outOfHoursImpact,
      subtext: 'meetings',
      borderColor: 'border-orange-200',
      impactColor: 'text-orange-600',
      isActive: outOfHoursMeetingCount > 0
    },
    {
      label: 'Double-Booking',
      value: doubleBookingCount,
      impact: doubleBookingImpact,
      subtext: 'conflicts',
      borderColor: 'border-red-200',
      impactColor: 'text-red-600',
      isActive: doubleBookingCount > 0
    },
  ].filter(factor => factor.isActive);

  // Inactive factors (for expanded view)
  const inactiveFactors = [
    {
      label: 'Back-to-Back',
      value: backToBackCount,
      subtext: 'meetings',
      isActive: backToBackCount > 0
    },
    {
      label: 'Short Buffers',
      value: insufficientBufferCount,
      subtext: 'occurrences',
      isActive: insufficientBufferCount > 0
    },
    {
      label: 'Focus Blocks',
      value: focusBlockCount,
      subtext: 'blocks',
      isActive: focusBlockCount > 0
    },
    {
      label: 'Out of Hours',
      value: outOfHoursMeetingCount,
      subtext: 'meetings',
      isActive: outOfHoursMeetingCount > 0
    },
    {
      label: 'Double-Booking',
      value: doubleBookingCount,
      subtext: 'conflicts',
      isActive: doubleBookingCount > 0
    },
  ].filter(factor => !factor.isActive);

  // Get badge color based on health interpretation
  const badgeClasses = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  }[healthInterpretation.color] || 'bg-gray-100 text-gray-800';

  // Calculate circle progress (for SVG)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = healthScore !== null ? (healthScore / 100) * circumference : 0;
  const offset = circumference - progress;

  // Get score color for the ring
  const scoreColor = {
    green: '#10b981',
    blue: '#3b82f6',
    yellow: '#f59e0b',
    red: '#ef4444',
  }[healthInterpretation.color] || '#6b7280';

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl shadow-md border border-indigo-100">
      {/* Main Content */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-5">
          {/* Score Circle */}
          <div className="flex-shrink-0">
            <div className="relative w-[80px] h-[80px]">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={scoreColor}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isCalculating || healthScore === null ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    <span className="text-[10px] text-gray-500 font-medium mt-1">Loading</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-gray-900">{healthScore}</span>
                    <span className="text-[10px] text-gray-500 font-medium">SCORE</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Title and Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base font-bold text-gray-900">Calendar Health Score</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClasses}`}>
                {healthInterpretation.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {activeFactors.length > 0
                ? `${activeFactors.length} active factor${activeFactors.length !== 1 ? 's' : ''} affecting your score`
                : 'No health factors detected - great job!'}
            </p>

            {/* Active Factors Grid */}
            {activeFactors.length > 0 && (
              <div className={`grid gap-2 ${activeFactors.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {activeFactors.map((factor, index) => (
                  <div
                    key={index}
                    className={`bg-white/60 rounded-lg px-3 py-2 border ${factor.borderColor}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-medium">{factor.label}</span>
                      <span className={`font-bold text-sm ${factor.impactColor}`}>
                        {factor.impact > 0 ? '+' : ''}{factor.impact}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{factor.value}</p>
                    <p className="text-xs text-gray-500">{factor.subtext}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expand/Collapse Toggle */}
          {inactiveFactors.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg p-1.5 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Section (Inactive Factors) */}
      {isExpanded && inactiveFactors.length > 0 && (
        <div className="px-5 pb-4 pt-2 border-t border-indigo-200">
          <p className="text-xs text-gray-600 mb-2 font-medium">All Health Factors (Including Inactive):</p>
          <div className="grid grid-cols-6 gap-2">
            {inactiveFactors.map((factor, index) => (
              <div
                key={index}
                className="bg-white/40 rounded-lg p-2 border border-gray-200 text-center"
              >
                <p className="text-xs text-gray-500 mb-0.5">{factor.label}</p>
                <p className="text-base font-bold text-gray-400">{factor.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
              <input
                type="checkbox"
                checked={showUnsnoozed}
                onChange={(e) => setShowUnsnoozed(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300"
              />
              <span>
                Show unsnoozed score: {/* TODO: Add unsnoozed score calculation */}
                {healthScore} (0 alerts snoozed)
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthScoreHero;
