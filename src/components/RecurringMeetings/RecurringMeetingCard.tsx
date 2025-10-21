import React from 'react';
import type { RecurringMeetingSeries } from '../../types/meetings';

const formatDateTime = (date?: Date) => {
  if (!date) {
    return 'No upcoming session';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

const formatDuration = (minutes: number) => {
  if (!minutes) {
    return '0 min';
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes} min`;
};

const getAudienceBadgeClasses = (audience: RecurringMeetingSeries['audience']) => {
  switch (audience) {
    case 'internal':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'external':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
};

type RecurringMeetingCardProps = {
  series: RecurringMeetingSeries;
  onSelect(series: RecurringMeetingSeries): void;
};

const RecurringMeetingCard: React.FC<RecurringMeetingCardProps> = ({ series, onSelect }) => {
  const { metrics } = series;

  return (
    <button
      type="button"
      onClick={() => onSelect(series)}
      className="w-full text-left bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-slate-500"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-slate-900">{series.title}</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getAudienceBadgeClasses(series.audience)}`}>
              {series.audience === 'mixed' ? 'Mixed audience' : `${series.audience.charAt(0).toUpperCase()}${series.audience.slice(1)} meeting`}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Host: {series.owner || 'Unknown owner'} • {series.cadence.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Next occurrence</p>
          <p className="text-sm font-semibold text-slate-800">{formatDateTime(series.nextOccurrence?.start)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        <div>
          <p className="text-xs text-slate-500 uppercase">Past month</p>
          <p className="text-lg font-semibold text-slate-900">{metrics.pastMonthOccurrences}</p>
          <p className="text-xs text-slate-500">occurrences</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Next month</p>
          <p className="text-lg font-semibold text-slate-900">{metrics.nextMonthOccurrences}</p>
          <p className="text-xs text-slate-500">scheduled</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Avg duration</p>
          <p className="text-lg font-semibold text-slate-900">{formatDuration(Math.round(metrics.averageDurationMinutes))}</p>
          <p className="text-xs text-slate-500">per session</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Attendance</p>
          <p className="text-lg font-semibold text-slate-900">{metrics.averageAttendance}</p>
          <p className="text-xs text-slate-500">avg attendees</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs text-slate-500 uppercase mb-2">Attendance trend (last {metrics.attendanceTrend.length} weeks)</p>
        <div className="flex items-end gap-1 h-16">
          {metrics.attendanceTrend.map((value, index) => {
            const barHeight = Math.min(100, value * 12);
            return (
              <div key={index} className="flex-1 flex items-end">
                <div
                  className="w-full rounded-t bg-slate-300"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {series.insights.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {series.insights.slice(0, 3).map((insight) => {
            const toneStyles = {
              warning: 'bg-rose-50 text-rose-700 border border-rose-200',
              info: 'bg-slate-100 text-slate-700 border border-slate-200',
              positive: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            } as const;
            return (
              <span key={insight.id} className={`text-xs px-2 py-1 rounded-full ${toneStyles[insight.tone]}`}>
                {insight.message}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
};

export default RecurringMeetingCard;
