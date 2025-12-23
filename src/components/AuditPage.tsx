import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@clerk/clerk-react';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import UpgradeModal from './UpgradeModal';
import CalendarConnectPrompt from './CalendarConnectPrompt';
import { PageHeader, CalendarSelectorCard, useSelectedCalendarId } from './shared';
import type { CalendarEvent } from '../types';
import type {
  RecurringAnalyticsResult,
  RecurringSeriesMetrics,
  RelationshipSnapshot
} from '../types/recurring';
import { computeRecurringAnalytics, summarizeRecurringSeries } from '../services/recurringAnalytics';
import { pdf } from '@react-pdf/renderer';
import { AuditPdfDocument } from './audit/AuditPdfDocument';

type TabKey = 'health' | 'relationships';
type AudienceFilter = 'all' | 'internal' | 'external' | 'mixed';
type FrequencyFilter = 'all' | 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Irregular';
type SortKey = 'time-cost' | 'alphabetical' | 'acceptance' | 'attendance';

const ANALYSIS_WINDOW_DAYS = 60;
const TABS: { key: TabKey; label: string; description: string }[] = [
  { key: 'health', label: 'Health Check', description: 'See recurring series with load, flags, and opportunities.' },
  { key: 'relationships', label: '1:1s', description: 'Track relationship cadence and catch overdue connections.' }
];

const statusTheme: Record<string, string> = {
  'high-people-hours': 'bg-yellow-100 text-yellow-700',
  'external-no-end': 'bg-purple-100 text-purple-700',
  stale: 'bg-slate-100 text-slate-700'
};

const relationshipStatusTheme: Record<string, { bg: string; text: string; label: string }> = {
  healthy: { bg: 'bg-green-100', text: 'text-green-700', label: 'Healthy' },
  overdue: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Overdue' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' }
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatHoursDisplay = (value: number) => `${Math.round(value * 10) / 10}h`;

const renderFlagChip = (flag: string) => {
  const theme = statusTheme[flag] || 'bg-slate-100 text-slate-700';
  const labelMap: Record<string, string> = {
    'high-people-hours': 'High people hours',
    'external-no-end': 'External - No end date',
    stale: 'Stale'
  };
  return (
    <span key={flag} className={`px-2.5 py-1 text-xs font-semibold rounded-full ${theme}`}>
      {labelMap[flag] || flag}
    </span>
  );
};

interface SummaryCardProps {
  label: string;
  value: string;
  helper?: string;
  icon?: string;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, helper, icon, onClick, isActive = false, disabled = false }) => {
  const interactive = typeof onClick === 'function';
  return (
    <button
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      className={`w-full text-left ${
        interactive
          ? `transition transform ${
              isActive
                ? 'border-indigo-500 shadow-md'
                : 'border-slate-200 hover:-translate-y-0.5 hover:shadow'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
          : 'border-slate-200'
      } bg-white rounded-xl border p-5 flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-xl">{icon}</span>}
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {helper && <p className="text-sm text-slate-500">{helper}</p>}
    </button>
  );
};

const RelationshipsSection: React.FC<{
  relationships: RelationshipSnapshot[];
  filterMode: 'all' | 'recurring' | 'one-off';
  onFilterModeChange: (value: 'all' | 'recurring' | 'one-off') => void;
  daysFilter: 'any' | 'overdue' | 'due-soon';
  onDaysFilterChange: (value: 'any' | 'overdue' | 'due-soon') => void;
}> = ({ relationships, filterMode, onFilterModeChange, daysFilter, onDaysFilterChange }) => {
  const filtered = relationships.filter(snapshot => {
    if (filterMode === 'recurring' && !snapshot.isRecurring) return false;
    if (filterMode === 'one-off' && snapshot.isRecurring) return false;
    if (daysFilter === 'overdue') {
      return snapshot.daysSinceLast !== null && snapshot.daysSinceLast > (snapshot.averageGapDays ? snapshot.averageGapDays * 2 : 60);
    }
    if (daysFilter === 'due-soon') {
      return snapshot.daysUntilNext !== null && snapshot.daysUntilNext <= (snapshot.averageGapDays || 30);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1:1 Relationship Tracker</h2>
          <p className="text-sm text-slate-500">
            Showing contacts from true 1:1s in the selected window.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">
            Relationship type
            <select
              value={filterMode}
              onChange={(e) => onFilterModeChange(e.target.value as 'all' | 'recurring' | 'one-off')}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="recurring">Recurring</option>
              <option value="one-off">One-off</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Upcoming status
            <select
              value={daysFilter}
              onChange={(e) => onDaysFilterChange(e.target.value as 'any' | 'overdue' | 'due-soon')}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="any">All</option>
              <option value="overdue">Overdue</option>
              <option value="due-soon">Due soon</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Relationships"
          value={filtered.length.toString()}
          helper="Total 1:1 counterparts in view."
        />
        <SummaryCard
          label="Recurring"
          value={filtered.filter(r => r.isRecurring).length.toString()}
          helper="Series-based 1:1s."
          onClick={() => onFilterModeChange(filterMode === 'recurring' ? 'all' : 'recurring')}
          isActive={filterMode === 'recurring'}
        />
        <SummaryCard
          label="One-off"
          value={filtered.filter(r => !r.isRecurring).length.toString()}
          helper="Single-instance 1:1s."
          onClick={() => onFilterModeChange(filterMode === 'one-off' ? 'all' : 'one-off')}
          isActive={filterMode === 'one-off'}
        />
        <SummaryCard
          label="Due soon"
          value={filtered.filter(r => r.daysUntilNext !== null && r.daysUntilNext <= (r.averageGapDays || 30)).length.toString()}
          helper="Upcoming within cadence window."
          onClick={() => onDaysFilterChange(daysFilter === 'due-soon' ? 'any' : 'due-soon')}
          isActive={daysFilter === 'due-soon'}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          No 1:1 relationships match the current filters.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Average cadence</th>
                  <th className="px-4 py-3">Last meeting</th>
                  <th className="px-4 py-3">Next meeting</th>
                  <th className="px-4 py-3">Cadence type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(snapshot => {
                  const statusThemeEntry = relationshipStatusTheme[snapshot.status];
                  return (
                    <tr key={snapshot.personEmail} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{snapshot.personName || snapshot.personEmail}</p>
                        <p className="text-xs text-slate-500">{snapshot.personEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusThemeEntry.bg} ${statusThemeEntry.text}`}>
                          {statusThemeEntry.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {snapshot.averageGapDays ? `${Math.round(snapshot.averageGapDays)} days` : 'Not enough data'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {snapshot.daysSinceLast !== null
                          ? `${Math.round(snapshot.daysSinceLast)} days ago`
                          : 'No recent meeting'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {snapshot.daysUntilNext !== null
                          ? snapshot.daysUntilNext >= 0
                            ? `In ${Math.round(snapshot.daysUntilNext)} days`
                            : `${Math.abs(Math.round(snapshot.daysUntilNext))} days overdue`
                          : 'Not scheduled'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {snapshot.isRecurring ? 'Recurring' : 'One-off'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const audienceFilterMatches = (item: RecurringSeriesMetrics, filter: AudienceFilter) => {
  if (item.isPlaceholder) {
    return filter === 'all';
  }
  switch (filter) {
    case 'internal':
      return item.externalAttendeeCount === 0;
    case 'external':
      return item.internalAttendeeCount === 0 && item.externalAttendeeCount > 0;
    case 'mixed':
      return item.internalAttendeeCount > 0 && item.externalAttendeeCount > 0;
    default:
      return true;
  }
};

const appliesFrequencyFilter = (item: RecurringSeriesMetrics, filter: FrequencyFilter) => {
  if (filter === 'all') return true;
  return item.frequencyLabel === filter;
};

const applySort = (series: RecurringSeriesMetrics[], sortKey: SortKey) => {
  switch (sortKey) {
    case 'alphabetical':
      return [...series].sort((a, b) => a.title.localeCompare(b.title));
    case 'acceptance':
      return [...series].sort((a, b) => a.acceptanceRate - b.acceptanceRate);
    case 'attendance':
      return [...series].sort((a, b) => (b.attendeeCount) - (a.attendeeCount));
    case 'time-cost':
    default:
      return [...series].sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);
  }
};

const AuditPage: React.FC = () => {
  const { user } = useUser();
  const {
    activeProvider,
    activeProviderId,
    isAuthenticated: providerIsAuthenticated
  } = useCalendarProvider();

  // Use the hook to get the currently selected calendar ID
  const managedCalendarId = useSelectedCalendarId();

  const { fetchEvents: fetchProviderEvents } = activeProvider.calendar;

  const [activeTab, setActiveTab] = useState<TabKey>('health');
  const [rangeMode, setRangeMode] = useState<'retro' | 'forward'>('retro');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('time-cost');
  const [includePlaceholders, setIncludePlaceholders] = useState(false);
  const [showPlaceholderOnly, setShowPlaceholderOnly] = useState(false);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | 'recurring' | 'one-off'>('all');
  const [relationshipDaysFilter, setRelationshipDaysFilter] = useState<'any' | 'overdue' | 'due-soon'>('any');
  const [analytics, setAnalytics] = useState<RecurringAnalyticsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fallbackEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    null;

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isCalendarConnected = useMemo(
    () => {
      const connected = providerIsAuthenticated(activeProviderId);
      console.info('[Recurring] Provider auth state', {
        activeProviderId,
        connected
      });
      return connected;
    },
    [providerIsAuthenticated, activeProviderId]
  );

  // For owner email, use the managedCalendarId if it looks like an email
  const ownerEmail = useMemo(() => {
    if (managedCalendarId && managedCalendarId.includes('@') && !managedCalendarId.includes('calendar.google.com')) {
      return managedCalendarId;
    }
    return fallbackEmail;
  }, [managedCalendarId, fallbackEmail]);

  useEffect(() => {
    if (!includePlaceholders) {
      setShowPlaceholderOnly(false);
    }
  }, [includePlaceholders]);

  const loadRecurringData = useCallback(async () => {
    if (!isCalendarConnected) return;
    const calendarIdToUse = managedCalendarId || 'primary';

    setLoading(true);
    setError(null);

    const now = new Date();
    let filterStart: Date;
    let filterEnd: Date;
    if (rangeMode === 'retro') {
      filterStart = new Date(now);
      filterStart.setDate(filterStart.getDate() - ANALYSIS_WINDOW_DAYS);
      filterEnd = new Date(now);
    } else {
      filterStart = new Date(now);
      filterEnd = new Date(now);
      filterEnd.setDate(filterEnd.getDate() + ANALYSIS_WINDOW_DAYS);
    }

    const relationshipWindowStart = new Date(now);
    relationshipWindowStart.setDate(relationshipWindowStart.getDate() - 90);
    const relationshipWindowEnd = new Date(now);
    relationshipWindowEnd.setDate(relationshipWindowEnd.getDate() + 90);

    const fetchStart = new Date(Math.min(filterStart.getTime(), relationshipWindowStart.getTime()));
    const fetchEnd = new Date(Math.max(filterEnd.getTime(), relationshipWindowEnd.getTime()));

    try {
      console.info('[Recurring] Loading events', {
        calendarIdToUse,
        filterStart: filterStart.toISOString(),
        filterEnd: filterEnd.toISOString()
      });
      const events: CalendarEvent[] = await fetchProviderEvents({
        timeMin: fetchStart.toISOString(),
        timeMax: fetchEnd.toISOString(),
        maxResults: 2500,
        calendarId: calendarIdToUse
      });

      const result = computeRecurringAnalytics(events, {
        ownerEmail: ownerEmail || undefined,
        filterStart,
        filterEnd,
        baselineWorkWeekHours: 40,
        rangeMode,
        relationshipWindowStart,
        relationshipWindowEnd
      });

      setAnalytics(result);
    } catch (err) {
      console.error('Failed to load recurring data', err);
      setError(err instanceof Error ? err.message : 'Failed to load recurring analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [fetchProviderEvents, isCalendarConnected, managedCalendarId, ownerEmail, rangeMode]);

  useEffect(() => {
    loadRecurringData();
  }, [loadRecurringData]);

  const toggleInternalQuickFilter = () => {
    setShowFlaggedOnly(false);
    setShowPlaceholderOnly(false);
    setAudienceFilter(prev => (prev === 'internal' ? 'all' : 'internal'));
  };

  const toggleExternalQuickFilter = () => {
    setShowFlaggedOnly(false);
    setShowPlaceholderOnly(false);
    setAudienceFilter(prev => (prev === 'external' ? 'all' : 'external'));
  };

  const togglePlaceholderQuickFilter = () => {
    setShowFlaggedOnly(false);
    if (!includePlaceholders) {
      setIncludePlaceholders(true);
      setShowPlaceholderOnly(true);
      setAudienceFilter('all');
      return;
    }
    setShowPlaceholderOnly(prev => {
      const next = !prev;
      if (!next) {
        setAudienceFilter('all');
      }
      return next;
    });
  };

  const toggleFlaggedQuickFilter = () => {
    setShowPlaceholderOnly(false);
    setShowFlaggedOnly(prev => !prev);
    setAudienceFilter('all');
  };

  const filteredSeries = useMemo(() => {
    if (!analytics) return [];
    const searchLower = searchTerm.toLowerCase();
    let result = analytics.series.filter(item => {
      if (!audienceFilterMatches(item, audienceFilter)) return false;
      if (!appliesFrequencyFilter(item, frequencyFilter)) return false;
      if (searchLower) {
        const combined = `${item.title} ${item.organizerEmail || ''}`.toLowerCase();
        if (!combined.includes(searchLower)) {
          return false;
        }
      }
      return true;
    });
    if (!includePlaceholders) {
      result = result.filter(item => !item.isPlaceholder);
    }
    if (showPlaceholderOnly) {
      result = result.filter(item => item.isPlaceholder);
    }
    if (showFlaggedOnly) {
      result = result.filter(item => item.flags.length > 0);
    }
    return applySort(result, sortKey);
  }, [analytics, audienceFilter, frequencyFilter, includePlaceholders, showFlaggedOnly, showPlaceholderOnly, searchTerm, sortKey]);

  const summaryForDisplay = useMemo(() => {
    if (!analytics) return null;
    const baseline = analytics.series.filter(item => includePlaceholders || !item.isPlaceholder);
    return summarizeRecurringSeries(baseline, 40);
  }, [analytics, includePlaceholders]);

  // PDF Export handler
  const handleExportPdf = useCallback(async () => {
    if (!summaryForDisplay || !analytics) return;

    setExporting(true);
    try {
      const blob = await pdf(
        <AuditPdfDocument
          summary={summaryForDisplay}
          series={analytics.series}
          relationships={analytics.relationships}
          generatedAt={new Date()}
          calendarName={managedCalendarId || 'Primary Calendar'}
          rangeMode={rangeMode}
          windowDays={ANALYSIS_WINDOW_DAYS}
        />
      ).toBlob();

      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendar-audit-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [summaryForDisplay, analytics, managedCalendarId, rangeMode]);

  if (!isCalendarConnected) {
    console.info('[Recurring] Rendering CalendarConnectPrompt - provider not connected');
    return <CalendarConnectPrompt />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header - sticky variant for consistency */}
      <PageHeader
        title="Calendar Audit"
        description="Audit recurring series, protect focus time, and keep relationships healthy. Filters cover the selected calendar and time window."
        variant="sticky"
        actions={
          <button
            onClick={handleExportPdf}
            disabled={exporting || loading || !summaryForDisplay}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${exporting || loading || !summaryForDisplay
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
              }
            `}
            title={!summaryForDisplay ? 'Load data first' : 'Export audit report as PDF'}
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </>
            )}
          </button>
        }
      />

      {/* Calendar Management Section - Self-contained component that handles its own data fetching */}
      <CalendarSelectorCard
        showProviderSwitcher={true}
        showActionButtons={true}
        showResetButton={false}
        onUpgrade={() => setShowUpgradeModal(true)}
      />

      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 text-sm font-medium w-fit">
        <button
          type="button"
          onClick={() => setRangeMode('retro')}
          className={`px-3 py-1 rounded-md transition-colors ${rangeMode === 'retro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Past {ANALYSIS_WINDOW_DAYS} days
        </button>
        <button
          type="button"
          onClick={() => setRangeMode('forward')}
          className={`px-3 py-1 rounded-md transition-colors ${rangeMode === 'forward' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Upcoming {ANALYSIS_WINDOW_DAYS} days
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Showing {rangeMode === 'retro' ? 'historic' : 'upcoming'} recurring activity over {ANALYSIS_WINDOW_DAYS} days.
        </p>
        {activeTab === 'health' && (
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={includePlaceholders}
              onChange={(e) => setIncludePlaceholders(e.target.checked)}
            />
            Include placeholder series (no attendees)
          </label>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Analysing recurring patterns…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && analytics && summaryForDisplay && (
        <div className="space-y-6">
            {activeTab === 'health' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SummaryCard
                    label="Recurring Series"
                    value={summaryForDisplay.totalSeries.toString()}
                    helper="Distinct recurring meeting series within the selected window."
                    icon="🔁"
                  />
                  <SummaryCard
                    label="Monthly Load"
                    value={formatHoursDisplay(summaryForDisplay.monthlyHours)}
                    helper={`≈ ${Math.round(summaryForDisplay.percentOfWorkWeek)}% of a 40h work week`}
                    icon="⏱️"
                  />
                  <SummaryCard
                    label="People Hours (Monthly)"
                    value={`${Math.round(summaryForDisplay.peopleHours)}h`}
                    helper="Attendee time invested across recurring meetings."
                    icon="🧑‍🤝‍🧑"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Filters</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <SummaryCard
                      label="Internal series"
                      value={summaryForDisplay.internalSeries.toString()}
                      helper="Only internal attendees."
                      onClick={toggleInternalQuickFilter}
                      isActive={audienceFilter === 'internal'}
                    />
                    <SummaryCard
                      label="External series"
                      value={summaryForDisplay.externalSeries.toString()}
                      helper="Only external attendees."
                      onClick={toggleExternalQuickFilter}
                      isActive={audienceFilter === 'external'}
                    />
                    {includePlaceholders && (
                      <SummaryCard
                        label="Placeholder series"
                        value={summaryForDisplay.placeholderSeries.toString()}
                        helper="Series without attendees (placeholders)."
                        onClick={togglePlaceholderQuickFilter}
                        isActive={showPlaceholderOnly}
                      />
                    )}
                    <SummaryCard
                      label="Flagged series"
                      value={summaryForDisplay.flaggedSeries.toString()}
                    helper="Series marked with warnings."
                      onClick={toggleFlaggedQuickFilter}
                      isActive={showFlaggedOnly}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
                  <label className="text-sm font-medium text-slate-700">
                    Audience
                    <select
                      value={audienceFilter}
                      onChange={(e) => setAudienceFilter(e.target.value as AudienceFilter)}
                      className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All meetings</option>
                      <option value="internal">Internal only</option>
                      <option value="external">External only</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Frequency
                    <select
                      value={frequencyFilter}
                      onChange={(e) => setFrequencyFilter(e.target.value as FrequencyFilter)}
                      className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All frequencies</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Irregular">Irregular</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700 flex-1 min-w-[200px]">
                    Search
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by meeting or organiser"
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Sort by
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="time-cost">Time cost</option>
                      <option value="alphabetical">Alphabetical</option>
                      <option value="acceptance">Acceptance</option>
                      <option value="attendance">Attendee count</option>
                    </select>
                  </label>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-[560px] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Series</th>
                          <th className="px-4 py-3 bg-yellow-100 text-yellow-800">DEBUG IDs</th>
                          <th className="px-4 py-3">Cadence</th>
                          <th className="px-4 py-3">Monthly Load</th>
                          <th className="px-4 py-3">Attendees</th>
                          <th className="px-4 py-3">Engagement</th>
                          <th className="px-4 py-3">Flags</th>
                          <th className="px-4 py-3">
                            {rangeMode === 'retro' ? 'Last Occurrence' : 'Next Occurrence'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSeries.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                              No recurring series match the filters. Try widening the search or time window.
                            </td>
                          </tr>
                        )}
                        {filteredSeries.map(item => {
                          // Debug: extract IDs from first sample event
                          const sampleEvent = item.sampleEvents[0];
                          const debugInfo = {
                            groupKey: item.id,
                            iCalUID: sampleEvent?.iCalUID || 'none',
                            recurringEventId: sampleEvent?.recurringEventId || 'none',
                            eventId: sampleEvent?.id || 'none',
                            instances: item.totalInstances
                          };
                          return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 align-top">
                              <p className="font-semibold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                {item.organizerEmail || 'Unknown organiser'}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-top bg-yellow-50 min-w-[300px]">
                              <div className="text-xs font-mono space-y-1 break-all">
                                <p><span className="font-bold text-yellow-700">key:</span> {debugInfo.groupKey}</p>
                                <p><span className="font-bold text-yellow-700">iCal:</span> {debugInfo.iCalUID}</p>
                                <p><span className="font-bold text-yellow-700">recur:</span> {debugInfo.recurringEventId}</p>
                                <p><span className="font-bold text-yellow-700">evtId:</span> {debugInfo.eventId}</p>
                                <p><span className="font-bold text-yellow-700">inst:</span> {debugInfo.instances}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-slate-800">{item.frequencyLabel}</span>
                                <span className="text-xs text-slate-500">
                                  Avg gap {item.averageGapDays ? `${Math.round(item.averageGapDays)} days` : 'n/a'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col text-sm text-slate-700">
                                <span>{formatHoursDisplay(item.monthlyMinutes / 60)}</span>
                                <span className="text-xs text-slate-500">
                                  People hours {Math.round(item.peopleHoursPerMonth)}h
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col text-sm text-slate-700">
                                <span>{item.attendeeCount} people</span>
                                <span className="text-xs text-slate-500">
                                  {item.internalAttendeeCount} internal • {item.externalAttendeeCount} external
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col text-sm text-slate-700">
                                <span>Acceptance {formatPercent(item.acceptanceRate)}</span>
                                <span className="text-xs text-slate-500">Cancelled {formatPercent(item.cancellationRate)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-wrap gap-1.5">
                                {item.flags.length === 0 && (
                                  <span className="text-xs text-slate-400">No flags</span>
                                )}
                                {item.flags.map(renderFlagChip)}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-sm text-slate-600">
                              {rangeMode === 'retro'
                                ? item.lastOccurrence
                                  ? `${formatDistanceToNow(item.lastOccurrence, { addSuffix: true })}`
                                  : 'No past instances'
                                : item.nextOccurrence
                                  ? `${formatDistanceToNow(item.nextOccurrence, { addSuffix: true })}`
                                  : 'No upcoming instances'}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'relationships' && (
              <RelationshipsSection
                relationships={analytics.relationships}
                filterMode={relationshipFilter}
                onFilterModeChange={setRelationshipFilter}
                daysFilter={relationshipDaysFilter}
                onDaysFilterChange={setRelationshipDaysFilter}
              />
            )}
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier="basic"
      />
    </div>
  );
};

export default AuditPage;
