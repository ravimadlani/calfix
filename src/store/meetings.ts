import { useSyncExternalStore } from 'react';
import type { CalendarEvent } from '../types/calendar';
import type {
  RecurringMeetingFilters,
  RecurringMeetingOptions,
  RecurringMeetingSeries
} from '../types/meetings';
import { filterRecurringMeetings, normalizeRecurringMeetings } from '../utils/meetingInsights';

type RecurringMeetingsView = 'grid' | 'timeline';

type RecurringMeetingsState = {
  loading: boolean;
  error: string | null;
  series: RecurringMeetingSeries[];
  filteredSeries: RecurringMeetingSeries[];
  filters: RecurringMeetingFilters;
  view: RecurringMeetingsView;
  selectedSeriesId: string | null;
  lastHydratedAt: Date | null;
};

const defaultFilters: RecurringMeetingFilters = {
  audience: 'all',
  search: '',
  showCancelled: false
};

const createInitialState = (): RecurringMeetingsState => ({
  loading: false,
  error: null,
  series: [],
  filteredSeries: [],
  filters: { ...defaultFilters },
  view: 'grid',
  selectedSeriesId: null,
  lastHydratedAt: null
});

type Listener = () => void;

const listeners = new Set<Listener>();

let state: RecurringMeetingsState = createInitialState();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setState = (
  updater: RecurringMeetingsState | ((current: RecurringMeetingsState) => RecurringMeetingsState)
) => {
  const nextState =
    typeof updater === 'function'
      ? (updater as (current: RecurringMeetingsState) => RecurringMeetingsState)(state)
      : updater;
  state = nextState;
  notify();
};

const applyFilters = (
  series: RecurringMeetingSeries[],
  filters: RecurringMeetingFilters
): RecurringMeetingSeries[] => {
  return filterRecurringMeetings(series, filters);
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useRecurringMeetingsStore = <T>(
  selector: (current: RecurringMeetingsState) => T
): T => {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );
};

const hydrateFromEvents = (
  events: CalendarEvent[],
  options?: RecurringMeetingOptions
) => {
  setState((current) => {
    const series = normalizeRecurringMeetings(events, options);
    const filters = current.filters;
    return {
      ...current,
      loading: false,
      series,
      filteredSeries: applyFilters(series, filters),
      lastHydratedAt: options?.referenceDate ?? new Date()
    };
  });
};

const setLoading = (loading: boolean) => {
  setState((current) => ({ ...current, loading }));
};

const setError = (error: string | null) => {
  setState((current) => ({ ...current, error }));
};

const setView = (view: RecurringMeetingsView) => {
  setState((current) => ({ ...current, view }));
};

const setFilters = (partial: Partial<RecurringMeetingFilters>) => {
  setState((current) => {
    const filters = { ...current.filters, ...partial };
    return {
      ...current,
      filters,
      filteredSeries: applyFilters(current.series, filters)
    };
  });
};

const resetFilters = () => {
  setState((current) => {
    const filters = { ...defaultFilters };
    return {
      ...current,
      filters,
      filteredSeries: applyFilters(current.series, filters)
    };
  });
};

const selectSeries = (seriesId: string | null) => {
  setState((current) => ({ ...current, selectedSeriesId: seriesId }));
};

const resetStore = () => {
  state = createInitialState();
  notify();
};

export const recurringMeetingsActions = {
  hydrateFromEvents,
  setLoading,
  setError,
  setView,
  setFilters,
  resetFilters,
  selectSeries,
  resetStore
};

export const getRecurringMeetingsState = () => state;
