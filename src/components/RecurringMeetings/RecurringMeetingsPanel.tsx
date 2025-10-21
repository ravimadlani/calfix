import React, { useMemo } from 'react';
import RecurringMeetingCard from './RecurringMeetingCard';
import RecurringMeetingsTimeline from './RecurringMeetingsTimeline';
import RecurringMeetingDetails from './RecurringMeetingDetails';
import { recurringMeetingsActions, useRecurringMeetingsStore } from '../../store/meetings';
import type { RecurringMeetingSeries } from '../../types/meetings';

type ViewOption = 'grid' | 'timeline';

type AudienceFilter = 'all' | 'internal' | 'external' | 'mixed';

const viewOptions: Array<{ value: ViewOption; label: string }> = [
  { value: 'grid', label: 'Grid' },
  { value: 'timeline', label: 'Timeline' }
];

const audienceOptions: Array<{ value: AudienceFilter; label: string }> = [
  { value: 'all', label: 'All meetings' },
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'mixed', label: 'Mixed' }
];

const RecurringMeetingsPanel: React.FC = () => {
  const { filteredSeries, view, filters, loading, error, selectedSeriesId } = useRecurringMeetingsStore((state) => ({
    filteredSeries: state.filteredSeries,
    view: state.view,
    filters: state.filters,
    loading: state.loading,
    error: state.error,
    selectedSeriesId: state.selectedSeriesId
  }));

  const selectedSeries = useRecurringMeetingsStore((state) =>
    state.series.find((series) => series.id === state.selectedSeriesId) ?? null
  );

  const summary = useMemo(() => {
    if (!filteredSeries.length) {
      return { totalMinutes: 0, totalUpcoming: 0, averageAttendance: 0 };
    }

    const totalMinutes = filteredSeries.reduce((acc, series) => acc + series.metrics.totalPastMinutes, 0);
    const totalUpcoming = filteredSeries.reduce((acc, series) => acc + series.metrics.nextMonthOccurrences, 0);
    const averageAttendance =
      filteredSeries.reduce((acc, series) => acc + series.metrics.averageAttendance, 0) /
      filteredSeries.length;

    return {
      totalMinutes,
      totalUpcoming,
      averageAttendance: Math.round(averageAttendance * 10) / 10
    };
  }, [filteredSeries]);

  const handleViewChange = (nextView: ViewOption) => {
    recurringMeetingsActions.setView(nextView);
  };

  const handleAudienceChange = (audience: AudienceFilter) => {
    recurringMeetingsActions.setFilters({ audience });
  };

  const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    recurringMeetingsActions.setFilters({ search: event.target.value });
  };

  const handleToggleCancelled = () => {
    recurringMeetingsActions.setFilters({ showCancelled: !filters.showCancelled });
  };

  const handleSelectSeries = (series: RecurringMeetingSeries) => {
    recurringMeetingsActions.selectSeries(series.id);
  };

  const closeDetails = () => {
    recurringMeetingsActions.selectSeries(null);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <span className="animate-spin mr-3 h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full" />
          Loading recurring meetings…
        </div>
      );
    }

    if (error) {
      return (
        <div className="border border-rose-200 bg-rose-50 text-rose-700 rounded-xl p-6">
          <p className="font-semibold mb-1">Unable to compute meeting insights</p>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    if (!filteredSeries.length) {
      return (
        <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500">
          No recurring meetings match the current filters.
        </div>
      );
    }

    if (view === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSeries.map((series) => (
            <RecurringMeetingCard key={series.id} series={series} onSelect={handleSelectSeries} />
          ))}
        </div>
      );
    }

    return <RecurringMeetingsTimeline series={filteredSeries} onSelect={handleSelectSeries} />;
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <span role="img" aria-label="Recurring meetings">🔁</span>
              Recurring meetings health
            </h2>
            <p className="text-sm text-slate-500">
              Track which meeting series are consuming the most time and spot opportunities to optimize your calendar.
            </p>
          </div>
          <div className="inline-flex bg-slate-100 rounded-lg p-1">
            {viewOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleViewChange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === option.value
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {audienceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleAudienceChange(option.value)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  filters.audience === option.value
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <label className="relative flex-1">
              <span className="sr-only">Search recurring meetings</span>
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
              <input
                type="search"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search meetings or owners"
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </label>
            <button
              type="button"
              onClick={handleToggleCancelled}
              className={`px-3 py-2 text-sm rounded-lg border ${
                filters.showCancelled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {filters.showCancelled ? 'Including cancelled' : 'Hide cancelled'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500">Series in view</p>
            <p className="text-2xl font-semibold text-slate-900">{filteredSeries.length}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500">Hours last month</p>
            <p className="text-2xl font-semibold text-slate-900">{Math.round(summary.totalMinutes / 60)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500">Upcoming sessions</p>
            <p className="text-2xl font-semibold text-slate-900">{summary.totalUpcoming}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500">Avg attendance</p>
            <p className="text-2xl font-semibold text-slate-900">{summary.averageAttendance}</p>
          </div>
        </div>
      </div>

      {renderContent()}

      <RecurringMeetingDetails series={selectedSeriesId ? selectedSeries : null} onClose={closeDetails} />
    </section>
  );
};

export default RecurringMeetingsPanel;
