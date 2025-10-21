import React from 'react';
import type { RecurringMeetingSeries } from '../../types/meetings';

type RecurringMeetingDetailsProps = {
  series: RecurringMeetingSeries | null;
  onClose(): void;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);

const RecurringMeetingDetails: React.FC<RecurringMeetingDetailsProps> = ({ series, onClose }) => {
  if (!series) {
    return null;
  }

  const upcoming = series.timeline.upcoming.filter((occurrence) => !occurrence.isCancelled).slice(0, 5);
  const recent = [...series.timeline.past]
    .filter((occurrence) => !occurrence.isCancelled)
    .reverse()
    .slice(0, 5);

  const toneStyles = {
    warning: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-slate-50 text-slate-700 border border-slate-200',
    positive: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  } as const;

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
          <div>
            <p className="text-xs uppercase text-slate-500 mb-1">Recurring meeting</p>
            <h2 className="text-2xl font-semibold text-slate-900">{series.title}</h2>
            <p className="text-sm text-slate-500 mt-1">
              Host: {series.owner || 'Unknown owner'} • {series.cadence.label} • {series.audience === 'mixed' ? 'Mixed audience' : `${series.audience} series`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs uppercase text-slate-500">Last month</p>
              <p className="text-2xl font-semibold text-slate-900">{series.metrics.pastMonthOccurrences}</p>
              <p className="text-xs text-slate-500">occurrences</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs uppercase text-slate-500">Time invested</p>
              <p className="text-2xl font-semibold text-slate-900">{Math.round(series.metrics.totalPastMinutes / 60)}h</p>
              <p className="text-xs text-slate-500">in the past month</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs uppercase text-slate-500">Avg duration</p>
              <p className="text-2xl font-semibold text-slate-900">{Math.round(series.metrics.averageDurationMinutes)}m</p>
              <p className="text-xs text-slate-500">per session</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs uppercase text-slate-500">Cancellation rate</p>
              <p className="text-2xl font-semibold text-slate-900">{Math.round(series.metrics.cancellationRate * 100)}%</p>
              <p className="text-xs text-slate-500">of occurrences</p>
            </div>
          </div>

          {series.insights.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Insights</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {series.insights.map((insight) => (
                  <div key={insight.id} className={`rounded-xl px-4 py-3 text-sm ${toneStyles[insight.tone]}`}>
                    {insight.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Upcoming</h3>
              {upcoming.length ? (
                <ul className="space-y-2">
                  {upcoming.map((occurrence) => (
                    <li key={occurrence.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-700">{formatDate(occurrence.start)}</span>
                      <span className="text-xs text-slate-500">{occurrence.totalAttendees} attendees</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No upcoming sessions scheduled.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Recent history</h3>
              {recent.length ? (
                <ul className="space-y-2">
                  {recent.map((occurrence) => (
                    <li key={occurrence.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-700">{formatDate(occurrence.start)}</span>
                      <span className="text-xs text-slate-500">{occurrence.totalAttendees} attendees</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No recent sessions recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringMeetingDetails;
