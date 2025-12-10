import { useCalendarHolds } from '../../hooks/useCalendarHolds';
import { useState } from 'react';

const formatDateTime = (dateStr: string, timezone?: string) => {
  const date = new Date(dateStr);
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

export function ActiveHoldsSection() {
  const { holds, isLoading, cancelHold } = useCalendarHolds();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async (holdId: string) => {
    setCancelingId(holdId);
    setError(null);
    try {
      await cancelHold(holdId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel hold');
    } finally {
      setCancelingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-500">Loading holds...</p>
      </div>
    );
  }

  if (holds.length === 0) {
    return null; // Don't show section if no active holds
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">Active Calendar Holds</h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {holds.length} hold{holds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="mb-3 p-2 text-sm bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {holds.map(hold => (
          <div
            key={hold.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700 truncate">
                {hold.meeting_purpose}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatDateTime(hold.start_time)} — {formatDateTime(hold.end_time).split(', ')[1]}
              </p>
              {hold.participants && hold.participants.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {hold.participants.length} participant{hold.participants.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleCancel(hold.id)}
              disabled={cancelingId === hold.id}
              className="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {cancelingId === hold.id ? 'Canceling...' : 'Cancel'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActiveHoldsSection;
