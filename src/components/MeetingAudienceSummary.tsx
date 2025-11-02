import { formatHours } from '../utils/dateHelpers';

interface MeetingAudienceSummaryProps {
  totalMeetings: number;
  totalMeetingHours: number;
  internalMeetingCount: number;
  internalMeetingHours: number;
  externalMeetingCount: number;
  externalMeetingHours: number;
  className?: string;
}

const formatHoursDisplay = (hours: number) => {
  if (!hours || hours <= 0) {
    return '0m';
  }
  return formatHours(hours);
};

const calculatePercentage = (count: number, total: number) => {
  if (!total || total <= 0) return 0;
  return (count / total) * 100;
};

const formatPercentageLabel = (count: number, total: number) => {
  const percent = calculatePercentage(count, total);
  if (percent === 0) return '0%';

  if ((percent > 0 && percent < 1) || (percent > 99 && percent < 100)) {
    return percent.toFixed(1).replace(/\.0$/, '') + '%';
  }

  return `${Math.round(percent)}%`;
};

const MeetingAudienceSummary = ({
  totalMeetings,
  totalMeetingHours,
  internalMeetingCount,
  internalMeetingHours,
  externalMeetingCount,
  externalMeetingHours,
  className = ''
}: MeetingAudienceSummaryProps) => {
  const internalPercent = calculatePercentage(internalMeetingCount, totalMeetings);
  const externalPercent = calculatePercentage(externalMeetingCount, totalMeetings);

  const normalizedInternal = Math.min(Math.max(internalPercent, 0), 100);
  const normalizedExternal = Math.min(Math.max(externalPercent, 0), 100 - normalizedInternal);

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">
              Audience Mix
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {totalMeetings} {totalMeetings === 1 ? 'meeting' : 'meetings'} · {formatHoursDisplay(totalMeetingHours)}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <span>ℹ️</span>
            <span>Internal = same domain · External = different domain</span>
          </div>
        </div>

        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${normalizedInternal}%` }}
          />
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${normalizedExternal}%` }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />
              <span className="font-medium text-gray-900">
                Internal — {formatPercentageLabel(internalMeetingCount, totalMeetings)}
              </span>
              <span className="text-gray-500">
                {formatHoursDisplay(internalMeetingHours)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {internalMeetingCount} {internalMeetingCount === 1 ? 'meeting' : 'meetings'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="inline-flex h-2 w-2 rounded-full bg-purple-500" aria-hidden="true" />
              <span className="font-medium text-gray-900">
                External — {formatPercentageLabel(externalMeetingCount, totalMeetings)}
              </span>
              <span className="text-gray-500">
                {formatHoursDisplay(externalMeetingHours)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {externalMeetingCount} {externalMeetingCount === 1 ? 'meeting' : 'meetings'}
            </span>
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg">
          <span>ℹ️</span>
          <span>Internal = same domain • External = different domain</span>
        </div>
      </div>
    </div>
  );
};

export default MeetingAudienceSummary;
