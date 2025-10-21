/**
 * Recurring Meetings Analysis Component
 * Comprehensive analytics dashboard for recurring meeting series
 * Designed for EA-level calendar audits with 1-month recap and 1-month forward views
 */

import React, { useState } from 'react';
import type { CalendarAnalytics, RecurringMeetingSeries } from '../types/analytics';

interface RecurringMeetingsAnalysisProps {
  analytics: CalendarAnalytics;
  onClose: () => void;
}

const RecurringMeetingsAnalysis: React.FC<RecurringMeetingsAnalysisProps> = ({
  analytics,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'time-investment' | 'health' | 'all-series'>('overview');

  const {
    recurringSeriesCount,
    recurringMeetingHours,
    recurringVsOneTimeRatio,
    topTimeConsumingSeries,
    staleRecurringSeries,
    newRecurringSeries,
    recurringWithoutVideoLinks,
    recurringWithoutAgenda,
    recurringCausingBackToBack,
    recurringOutOfHours,
    totalMeetingHours,
    recurringMeetingSeries
  } = analytics;

  // Helper function to format frequency icon
  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily': return '📅';
      case 'weekly': return '🔄';
      case 'biweekly': return '🔁';
      case 'monthly': return '📆';
      default: return '⏱️';
    }
  };

  // Helper function to format frequency color
  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'text-red-600 bg-red-100';
      case 'weekly': return 'text-blue-600 bg-blue-100';
      case 'biweekly': return 'text-purple-600 bg-purple-100';
      case 'monthly': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Render series card
  const renderSeriesCard = (series: RecurringMeetingSeries) => (
    <div key={series.recurringEventId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getFrequencyIcon(series.frequency)}</span>
            <h4 className="font-semibold text-gray-900">{series.summary}</h4>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-xs px-2 py-1 rounded ${getFrequencyColor(series.frequency)}`}>
              {series.frequencyLabel}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
              {series.occurrenceCount} instances
            </span>
            <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700">
              {series.totalHours}h total
            </span>
            {series.attendeeCount > 0 && (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                {series.attendeeCount} attendees
              </span>
            )}
          </div>

          {series.organizer && (
            <p className="text-sm text-gray-600 mb-2">
              Organized by: {series.organizer.displayName || series.organizer.email}
            </p>
          )}

          {/* Health indicators */}
          <div className="flex flex-wrap gap-2">
            {!series.hasVideoLink && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                ⚠️ No video link
              </span>
            )}
            {!series.hasAgenda && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                ⚠️ No agenda
              </span>
            )}
            {series.causesBackToBack && (
              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                🔴 Causes back-to-back
              </span>
            )}
            {series.isOutOfHours && (
              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                🌙 Outside hours
              </span>
            )}
            {series.isStale && (
              <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                ⏸️ Stale (30+ days)
              </span>
            )}
            {series.isNew && (
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                ✨ New
              </span>
            )}
            {series.declineRate > 30 && (
              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                📉 High decline rate ({series.declineRate.toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div>
          <span className="font-semibold">Avg Duration:</span>{' '}
          {series.occurrenceCount > 0
            ? Math.round(series.totalMinutes / series.occurrenceCount)
            : 0}min
        </div>
        <div>
          <span className="font-semibold">Decline Rate:</span> {series.declineRate.toFixed(0)}%
        </div>
        <div>
          <span className="font-semibold">Cancel Rate:</span> {series.cancellationRate.toFixed(0)}%
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Recurring Meetings Analytics</h2>
              <p className="text-purple-100">
                EA-Level Calendar Audit: {recurringSeriesCount} Active Series
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="text-sm text-purple-100">Total Series</div>
              <div className="text-2xl font-bold">{recurringSeriesCount}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="text-sm text-purple-100">Total Hours</div>
              <div className="text-2xl font-bold">{recurringMeetingHours}h</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="text-sm text-purple-100">% of Meetings</div>
              <div className="text-2xl font-bold">{recurringVsOneTimeRatio.toFixed(0)}%</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="text-sm text-purple-100">vs One-Time</div>
              <div className="text-2xl font-bold">
                {((totalMeetingHours - recurringMeetingHours) || 0).toFixed(0)}h
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex gap-4 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'time-investment', label: 'Time Investment', icon: '⏰' },
              { id: 'health', label: 'Health Issues', icon: '⚠️' },
              { id: 'all-series', label: 'All Series', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* New & Stale Series */}
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-green-700">
                    ✨ New Series ({newRecurringSeries.length})
                  </h3>
                  {newRecurringSeries.length > 0 ? (
                    <div className="space-y-3">
                      {newRecurringSeries.slice(0, 3).map(series => (
                        <div key={series.recurringEventId} className="text-sm">
                          <div className="font-medium">{series.summary}</div>
                          <div className="text-gray-600">{series.frequencyLabel} • {series.totalHours}h total</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">No new recurring series</p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">
                    ⏸️ Stale Series ({staleRecurringSeries.length})
                  </h3>
                  {staleRecurringSeries.length > 0 ? (
                    <div className="space-y-3">
                      {staleRecurringSeries.slice(0, 3).map(series => (
                        <div key={series.recurringEventId} className="text-sm">
                          <div className="font-medium">{series.summary}</div>
                          <div className="text-gray-600">
                            {series.daysWithoutMeeting} days since last meeting
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">All series are active</p>
                  )}
                </div>
              </div>

              {/* Health Summary */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Health Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                    <span className="text-sm font-medium">Without Video Links</span>
                    <span className="text-lg font-bold text-yellow-700">
                      {recurringWithoutVideoLinks.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                    <span className="text-sm font-medium">Without Agenda</span>
                    <span className="text-lg font-bold text-yellow-700">
                      {recurringWithoutAgenda.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                    <span className="text-sm font-medium">Causing Back-to-Back</span>
                    <span className="text-lg font-bold text-red-700">
                      {recurringCausingBackToBack.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded">
                    <span className="text-sm font-medium">Outside Hours</span>
                    <span className="text-lg font-bold text-orange-700">
                      {recurringOutOfHours.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top 5 Time Consuming */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Top 5 Time-Consuming Series
                </h3>
                <div className="space-y-3">
                  {topTimeConsumingSeries.slice(0, 5).map((series, index) => (
                    <div key={series.recurringEventId} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{series.summary}</div>
                        <div className="text-sm text-gray-600">
                          {series.frequencyLabel} • {series.occurrenceCount} instances
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-purple-700">{series.totalHours}h</div>
                        <div className="text-xs text-gray-600">total time</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Time Investment Tab */}
          {activeTab === 'time-investment' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-2">Time Investment Analysis</h3>
                <p className="text-gray-700 mb-4">
                  You spend <strong>{recurringMeetingHours} hours</strong> in recurring meetings,
                  which is <strong>{recurringVsOneTimeRatio.toFixed(0)}%</strong> of your total meeting time.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-8 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${Math.min(recurringVsOneTimeRatio, 100)}%` }}
                    />
                  </div>
                  <span className="font-bold text-purple-700">{recurringVsOneTimeRatio.toFixed(0)}%</span>
                </div>
              </div>

              <h4 className="text-md font-semibold mb-3">All Series by Time Investment</h4>
              <div className="space-y-3">
                {topTimeConsumingSeries.map(renderSeriesCard)}
              </div>
            </div>
          )}

          {/* Health Issues Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {recurringWithoutVideoLinks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-yellow-700">
                    ⚠️ Missing Video Links ({recurringWithoutVideoLinks.length})
                  </h3>
                  <div className="space-y-3">
                    {recurringWithoutVideoLinks.map(renderSeriesCard)}
                  </div>
                </div>
              )}

              {recurringWithoutAgenda.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-yellow-700">
                    ⚠️ Missing Agenda ({recurringWithoutAgenda.length})
                  </h3>
                  <div className="space-y-3">
                    {recurringWithoutAgenda.map(renderSeriesCard)}
                  </div>
                </div>
              )}

              {recurringCausingBackToBack.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-700">
                    🔴 Causing Back-to-Back Meetings ({recurringCausingBackToBack.length})
                  </h3>
                  <div className="space-y-3">
                    {recurringCausingBackToBack.map(renderSeriesCard)}
                  </div>
                </div>
              )}

              {recurringOutOfHours.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-orange-700">
                    🌙 Outside Business Hours ({recurringOutOfHours.length})
                  </h3>
                  <div className="space-y-3">
                    {recurringOutOfHours.map(renderSeriesCard)}
                  </div>
                </div>
              )}

              {recurringWithoutVideoLinks.length === 0 &&
               recurringWithoutAgenda.length === 0 &&
               recurringCausingBackToBack.length === 0 &&
               recurringOutOfHours.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
                  <p>No health issues detected in your recurring meetings.</p>
                </div>
              )}
            </div>
          )}

          {/* All Series Tab */}
          {activeTab === 'all-series' && (
            <div className="space-y-3">
              {recurringMeetingSeries.length > 0 ? (
                recurringMeetingSeries.map(renderSeriesCard)
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold mb-2">No Recurring Meetings</h3>
                  <p>You don't have any recurring meeting series.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Analyzing {recurringSeriesCount} recurring series across {totalMeetingHours.toFixed(1)} total meeting hours
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringMeetingsAnalysis;
