import type { CalendarProvider } from '../CalendarProvider';
import type { CalendarProviderId } from '../../../types';
import {
  addConferenceLink,
  createEvent,
  deleteEvent,
  fetchCalendarList,
  fetchEvents,
  findFreeBusy,
  googleHelperActions,
  handleGoogleApiError,
  updateEvent
} from './calendar';
import { googleAuth, GOOGLE_PROVIDER_ID } from './auth';

const providerId: CalendarProviderId = GOOGLE_PROVIDER_ID;

export const createGoogleCalendarProvider = (): CalendarProvider => ({
  id: providerId,
  label: 'Google Calendar',
  description: 'Connect your Google Workspace or personal Google Calendar account.',
  icon: 'google',
  capabilities: {
    supportsBuffers: true,
    supportsTravelBlocks: true,
    supportsFocusBlocks: true,
    supportsConferenceLinks: true,
    supportsBatchConferenceLinks: true,
    supportsFreeBusy: true,
    supportsColorMetadata: true,
    supportsLocationTracking: true
  },
  auth: googleAuth,
  calendar: {
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchCalendarList,
    findFreeBusy,
    addConferenceLink
  },
  helpers: googleHelperActions
});

export { handleGoogleApiError };
