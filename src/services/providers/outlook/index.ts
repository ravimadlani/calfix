/**
 * Microsoft Outlook Calendar Provider Factory
 * Assembles auth, calendar API, and helper methods into a CalendarProvider
 */

import type { CalendarProvider } from '../CalendarProvider';
import { outlookAuth, OUTLOOK_PROVIDER_ID } from './auth';
import { outlookCalendarApi, outlookHelperActions } from './calendar';

/**
 * Create Outlook Calendar Provider instance
 */
export const createOutlookCalendarProvider = (): CalendarProvider => ({
  id: OUTLOOK_PROVIDER_ID,
  label: 'Microsoft Outlook',
  description: 'Connect your Microsoft 365 or Outlook.com calendar account.',
  icon: 'microsoft', // You may need to add a Microsoft icon to your icons

  capabilities: {
    supportsBuffers: true,
    supportsTravelBlocks: true,
    supportsFocusBlocks: true,
    supportsConferenceLinks: true, // Microsoft Teams
    supportsBatchConferenceLinks: true,
    supportsFreeBusy: true,
    supportsColorMetadata: true, // Via categories
    supportsLocationTracking: true
  },

  auth: outlookAuth,
  calendar: outlookCalendarApi,
  helpers: outlookHelperActions
});

// Export provider ID for external use
export { OUTLOOK_PROVIDER_ID } from './auth';