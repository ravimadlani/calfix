import React from 'react';
import type { RecurringMeetingSeries } from '../../types/meetings';

type RecurringMeetingsTimelineProps = {
  series: RecurringMeetingSeries[];
  onSelect(series: RecurringMeetingSeries): void;
};

const formatDayLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);

const RecurringMeetingsTimeline: React.FC<RecurringMeetingsTimelineProps> = ({ series, onSelect }) => {
  if (!series.length) {
    return (
      <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500">
        No recurring meetings in this window.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {series.map((item) => {
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.cadence.label} • {item.audience === 'mixed' ? 'Mixed audience' : `${item.audience} series`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-slate-500">Next</p>
                  <p className="text-sm font-medium text-slate-800">
                    {item.nextOccurrence ? formatDayLabel(item.nextOccurrence.start) : 'No upcoming'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.timeline.past.map((occurrence) => (
                    <span
                      key={occurrence.id}
                      className="px-2 py-1 text-xs rounded-full bg-slate-200 text-slate-700"
                    >
                      {formatDayLabel(occurrence.start)}
                    </span>
                  ))}
                </div>
                <div className="text-xs uppercase text-slate-500">Today</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {item.timeline.upcoming.map((occurrence) => (
                    <span
                      key={occurrence.id}
                      className="px-2 py-1 text-xs rounded-full border border-slate-300 text-slate-700"
                    >
                      {formatDayLabel(occurrence.start)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Past month: {item.metrics.pastMonthOccurrences}</span>
                <span>Upcoming month: {item.metrics.nextMonthOccurrences}</span>
                <span>Avg attendance: {item.metrics.averageAttendance}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default RecurringMeetingsTimeline;
