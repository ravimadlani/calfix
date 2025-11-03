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
import type {
  CalendarEvent,
  CalendarListEntry
} from '../types';
import type {
  RecurringAnalyticsResult,
  RecurringSeriesMetrics,
  RelationshipSnapshot
} from '../types/recurring';
import { computeRecurringAnalytics, summarizeRecurringSeries } from '../services/recurringAnalytics';

type TabKey = 'health' | 'relationships' | 'audit';
type AudienceFilter = 'all' | 'internal' | 'external' | 'mixed';
type FrequencyFilter = 'all' | 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Irregular';
type SortKey = 'time-cost' | 'alphabetical' | 'acceptance' | 'attendance';

const ANALYSIS_WINDOW_DAYS = 60;
const MANAGED_CALENDAR_STORAGE_KEY = 'managed_calendar_id';
const TABS: { key: TabKey; label: string; description: string }[] = [
  { key: 'health', label: 'Health Check', description: 'See recurring series with load, flags, and opportunities.' },
  { key: 'relationships', label: '1:1s', description: 'Track relationship cadence and catch overdue connections.' },
  { key: 'audit', label: 'Audit Report', description: 'Summarise the estate and export a shareable report.' }
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

const AuditFlagRow: React.FC<{ label: string; count: number; helper: string }> = ({ label, count, helper }) => (
  <div className="flex items-start justify-between gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
    <div>
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
    <span className="text-lg font-semibold text-slate-900">{count}</span>
  </div>
);

const determineOwnerEmail = (
  selectedCalendar: CalendarListEntry | undefined,
  fallbackEmail: string | null | undefined
) => {
  if (selectedCalendar?.id && selectedCalendar.id.includes('@') && !selectedCalendar.id.includes('calendar.google.com')) {
    return selectedCalendar.id;
  }

  if (fallbackEmail) {
    return fallbackEmail;
  }

  return selectedCalendar?.id || null;
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

const RecurringPage: React.FC = () => {
  const { user } = useUser();
  const {
    activeProvider,
    activeProviderId
  } = useCalendarProvider();

  const {
    fetchEvents: fetchProviderEvents,
    fetchCalendarList: fetchProviderCalendarList
  } = activeProvider.calendar;

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
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [maxCalendars, setMaxCalendars] = useState(1);
  const [hasMultiCalendarAccess, setHasMultiCalendarAccess] = useState(false);
  const [isInTrial, setIsInTrial] = useState(false);
  const [daysLeftInTrial, setDaysLeftInTrial] = useState(0);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<CalendarListEntry[]>([]);
  const [allManageableCalendars, setAllManageableCalendars] = useState<CalendarListEntry[]>([]);
  const [managedCalendarId, setManagedCalendarId] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return 'primary';
    }
    const storedId = window.localStorage.getItem(MANAGED_CALENDAR_STORAGE_KEY);
    if (storedId && storedId !== '[object Object]') {
      return storedId;
    }
    return 'primary';
  });
  const [analytics, setAnalytics] = useState<RecurringAnalyticsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    null;

  const selectedCalendar = useMemo(
    () => availableCalendars.find(cal => cal.id === managedCalendarId) || availableCalendars[0],
    [availableCalendars, managedCalendarId]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(MANAGED_CALENDAR_STORAGE_KEY, managedCalendarId);
    } catch (error) {
      console.warn('Unable to persist calendar selection', error);
    }
  }, [managedCalendarId]);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const ownerEmail = useMemo(
    () => determineOwnerEmail(selectedCalendar, fallbackEmail),
    [selectedCalendar, fallbackEmail]
  );

  const checkSubscription = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setSubscriptionLoaded(true);
      return;
    }

    try {
      const response = await fetch(`/api/user/subscription?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionTier(data.subscriptionTier);
        setMaxCalendars(data.maxCalendars);
        setHasMultiCalendarAccess(data.hasMultiCalendarAccess);
        setIsInTrial(data.isInTrial);
        setDaysLeftInTrial(data.daysLeftInTrial);
      } else {
        setSubscriptionTier('basic');
        setMaxCalendars(1);
        setHasMultiCalendarAccess(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionTier('basic');
      setMaxCalendars(1);
      setHasMultiCalendarAccess(false);
    } finally {
      setSubscriptionLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const loadCalendarList = useCallback(async () => {
    try {
      const calendars = await fetchProviderCalendarList();

      const manageable = calendars.filter(cal => {
        const hasWriteAccess = cal.accessRole === 'owner' || cal.accessRole === 'writer';
        const isNotResource = !cal.id.includes('resource.calendar.google.com');
        const isUserCalendar = cal.id.includes('@') && (
          cal.primary ||
          (!cal.id.includes('@group.') && !cal.id.includes('@resource.'))
        );
        return hasWriteAccess && isNotResource && (isUserCalendar || cal.primary);
      });

      setAllManageableCalendars(manageable);

      let calendarsToShow = manageable;
      if (!hasMultiCalendarAccess) {
        calendarsToShow = manageable.filter(cal => cal.primary);
      } else {
        calendarsToShow = manageable.slice(0, maxCalendars);
      }

      if (calendarsToShow.length === 0) {
        calendarsToShow = calendars;
      }

      setAvailableCalendars(calendarsToShow);

      if (!calendarsToShow.find(cal => cal.id === managedCalendarId) && calendarsToShow.length > 0) {
        setManagedCalendarId(calendarsToShow[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch calendar list:', error);
    }
  }, [fetchProviderCalendarList, hasMultiCalendarAccess, managedCalendarId, maxCalendars]);

  useEffect(() => {
    if (!subscriptionLoaded) return;
    loadCalendarList();
  }, [loadCalendarList, subscriptionLoaded, activeProviderId]);

  useEffect(() => {
    if (!includePlaceholders) {
      setShowPlaceholderOnly(false);
    }
  }, [includePlaceholders]);

  const loadRecurringData = useCallback(async () => {
    if (!subscriptionLoaded) return;
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
  }, [fetchProviderEvents, managedCalendarId, ownerEmail, rangeMode, subscriptionLoaded]);

  useEffect(() => {
    if (!subscriptionLoaded) return;
    loadRecurringData();
  }, [loadRecurringData, subscriptionLoaded]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-slate-900">Recurring Meetings</h1>
        <p className="text-slate-600 text-sm">
          Audit recurring series, protect focus time, and keep relationships healthy. Filters cover the selected calendar and time window.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        {hasMultiCalendarAccess ? (
          <>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Managing Calendar:
              </label>
              <select
                value={managedCalendarId}
                onChange={(e) => setManagedCalendarId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm bg-white"
              >
                {availableCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary} {cal.primary ? '(Your Calendar)' : ''} - {cal.id}
                  </option>
                ))}
              </select>
              {managedCalendarId !== 'primary' && !availableCalendars.find(c => c.primary && c.id === managedCalendarId) && (
                <button
                  onClick={() => {
                    const primaryCal = availableCalendars.find(c => c.primary);
                    setManagedCalendarId(primaryCal ? primaryCal.id : 'primary');
                  }}
                  className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  Reset to My Calendar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {availableCalendars.find(c => c.id === managedCalendarId)?.summary || managedCalendarId}
              {' • '}
              {availableCalendars.length} calendar{availableCalendars.length !== 1 ? 's' : ''} available
              {managedCalendarId !== 'primary' && !availableCalendars.find(c => c.primary && c.id === managedCalendarId)
                ? ' • Managing as delegate'
                : ''}
            </p>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                📅 {availableCalendars[0]?.summary || 'Your Calendar'}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded uppercase">
                {isInTrial ? `${subscriptionTier || 'Loading'} Trial (${daysLeftInTrial} days left)` : (subscriptionTier || 'Loading')}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {hasMultiCalendarAccess
                ? `${availableCalendars.length} calendar${availableCalendars.length !== 1 ? 's' : ''} available`
                : 'Basic access • 1 calendar included'}
            </p>
            {allManageableCalendars.length > 1 && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                🔓 Unlock additional calendars
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
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
        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={loadRecurringData}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {/* TODO: Add preferences modal */}}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
          >
            Preferences
          </button>
        </div>
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

      {subscriptionTier === 'basic' && allManageableCalendars.length > 1 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">
                🎯 Unlock All Your Calendars
              </p>
              <p className="text-xs text-gray-600">
                You have access to {allManageableCalendars.length} calendars but can only manage 1 with Basic plan
              </p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all transform hover:scale-105 whitespace-nowrap"
            >
              Unlock All Calendars
            </button>
          </div>
        </div>
      )}

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
                            <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                              No recurring series match the filters. Try widening the search or time window.
                            </td>
                          </tr>
                        )}
                        {filteredSeries.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 align-top">
                              <p className="font-semibold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                {item.organizerEmail || 'Unknown organiser'}
                              </p>
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
                        ))}
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

            {activeTab === 'audit' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Audit Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AuditFlagRow
                      label="Total recurring series"
                      helper="Series in scope for this audit."
                      count={summaryForDisplay.totalSeries}
                    />
                    <AuditFlagRow
                      label="Weekly hours committed"
                      helper="Time blocked by recurring commitments."
                      count={Math.round(summaryForDisplay.weeklyHours)}
                    />
                    <AuditFlagRow
                      label="People-hours invested monthly"
                      helper="Aggregate attendee load."
                      count={Math.round(summaryForDisplay.peopleHours)}
                    />
                    <AuditFlagRow
                      label="Flagged series"
                      helper="Series worth review based on warning signals."
                      count={summaryForDisplay.flaggedSeries}
                    />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-md font-semibold text-slate-900">Flag breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.keys(statusTheme).map(flag => (
                      <div
                        key={flag}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      >
                        <span className="font-medium capitalize">{flag.replace('-', ' ')}</span>
                        <span className="font-semibold">
                          {summaryForDisplay.flagCounts[flag] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
                  <h3 className="text-md font-semibold text-slate-900">Recommended next steps</h3>
                  <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
                    <li>Review flagged series for cancellation or cadence changes, focusing on high-impact meetings.</li>
                    <li>Share the CSV report with stakeholders to align on adjustments.</li>
                    <li>Check overdue 1:1 relationships and schedule catch-ups where needed.</li>
                  </ul>
                </div>
              </div>
            )}
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={(subscriptionTier || 'basic') as 'basic' | 'ea' | 'ea_pro'}
      />
    </div>
  );
};

export default RecurringPage;
