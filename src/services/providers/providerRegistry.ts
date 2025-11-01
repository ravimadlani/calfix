import type { CalendarProviderId, CalendarProviderMetadata } from '../../types';
import type { CalendarProvider, CalendarProviderFactory } from './CalendarProvider';
import { createGoogleCalendarProvider } from './google';

const providerFactories: Partial<Record<CalendarProviderId, CalendarProviderFactory>> = {
  google: createGoogleCalendarProvider
};

const providerCache: Partial<Record<CalendarProviderId, CalendarProvider>> = {};

export const getCalendarProvider = (providerId: CalendarProviderId): CalendarProvider => {
  if (!providerFactories[providerId]) {
    throw new Error(`Provider ${providerId} is not registered`);
  }

  if (!providerCache[providerId]) {
    providerCache[providerId] = providerFactories[providerId]!();
  }

  return providerCache[providerId] as CalendarProvider;
};

export const listCalendarProviders = (): CalendarProvider[] => {
  return (Object.keys(providerFactories) as CalendarProviderId[]).map(getCalendarProvider);
};

export const getProviderMetadata = (): CalendarProviderMetadata[] => {
  const implemented = listCalendarProviders().map(provider => ({
    id: provider.id,
    label: provider.label,
    description: provider.description,
    icon: provider.icon,
    capabilities: provider.capabilities
  }));

  const planned: CalendarProviderMetadata[] = [
    {
      id: 'outlook',
      label: 'Microsoft Outlook',
      description: 'Microsoft 365 / Outlook.com calendar integration (coming soon)',
      icon: 'microsoft',
      capabilities: {
        supportsBuffers: true,
        supportsTravelBlocks: true,
        supportsFocusBlocks: true,
        supportsConferenceLinks: true,
        supportsBatchConferenceLinks: false,
        supportsFreeBusy: true,
        supportsColorMetadata: true,
        supportsLocationTracking: true
      }
    }
  ];

  return [...implemented, ...planned];
};

export const isProviderImplemented = (providerId: CalendarProviderId): boolean => {
  return Boolean(providerFactories[providerId]);
};

export const resetProviderRegistry = () => {
  Object.keys(providerCache).forEach(key => {
    delete providerCache[key as CalendarProviderId];
  });
};
