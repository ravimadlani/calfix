import React, { useState } from 'react';
import { UserButton } from '@clerk/clerk-react';
import type { CalendarProviderId, CalendarProviderMetadata } from '../types';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import googleCalendarLogo from '../assets/google-calendar.svg';

const CalendarConnectPrompt: React.FC = () => {
  const [isModalOpen, setModalOpen] = useState(false);

  const {
    providerMetadata,
    signIn,
    getStatus,
    getLastError,
    isAuthenticated,
    isProviderImplemented,
    setActiveProvider
  } = useCalendarProvider();

  const implementedProviders = providerMetadata.filter(meta => isProviderImplemented(meta.id));
  const comingSoonProviders = providerMetadata.filter(meta => !isProviderImplemented(meta.id));
  const connectedProviders = implementedProviders.filter(meta => isAuthenticated(meta.id));

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const handleConnect = async (providerId: CalendarProviderId) => {
    try {
      setActiveProvider(providerId);
      setModalOpen(false);
      await signIn(providerId);
    } catch (error) {
      console.error('Error initiating provider connection:', error);
      alert('Failed to start the connection flow. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100">
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 space-y-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl shadow-lg">
              📅
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-slate-900">
                Connect your calendar to get started
              </h1>
              <p className="text-lg text-slate-600">
                Choose the calendar provider you use (Google or Outlook soon). Once connected, CalFix can analyse events, automate fixes, and power team scheduling.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={openModal}
              className="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
            >
              <span role="img" aria-hidden="true">🔗</span>
              {connectedProviders.length > 0 ? 'Switch calendar provider' : 'Connect calendar'}
            </button>
            {connectedProviders.length > 0 && (
              <p className="text-sm text-emerald-600">
                Connected to {connectedProviders.map(provider => provider.label).join(', ')}. Use the button above to switch or add another provider.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <HighlightCard icon="⏰" title="Smart analytics" description="See meeting load, buffers, and conflicts instantly." />
            <HighlightCard icon="✈️" title="Travel savvy" description="Auto-detect flights and create travel & location blocks." />
            <HighlightCard icon="🤝" title="Team scheduling" description="Compare availability across calendars in one place." />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Why we ask for access</h2>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• We use OAuth 2.0 so your password never touches CalFix.</li>
              <li>• Tokens are stored per provider and can be revoked at any time.</li>
              <li>• We request the minimum scopes required for analytics and automation.</li>
            </ul>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ProviderSelectModal
          implementedProviders={implementedProviders}
          comingSoonProviders={comingSoonProviders}
          getStatus={getStatus}
          getLastError={getLastError}
          isAuthenticated={isAuthenticated}
          onConnect={handleConnect}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

interface HighlightCardProps {
  icon: string;
  title: string;
  description: string;
}

const HighlightCard: React.FC<HighlightCardProps> = ({ icon, title, description }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
    <div className="text-2xl">{icon}</div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="text-sm text-slate-600">{description}</p>
  </div>
);

interface ProviderSelectModalProps {
  implementedProviders: CalendarProviderMetadata[];
  comingSoonProviders: CalendarProviderMetadata[];
  getStatus: ReturnType<typeof useCalendarProvider>['getStatus'];
  getLastError: ReturnType<typeof useCalendarProvider>['getLastError'];
  isAuthenticated: ReturnType<typeof useCalendarProvider>['isAuthenticated'];
  onConnect: (providerId: CalendarProviderId) => void;
  onClose: () => void;
}

const providerBrandIcons: Partial<Record<CalendarProviderId, string>> = {
  google: googleCalendarLogo
};

const ProviderSelectModal: React.FC<ProviderSelectModalProps> = ({
  implementedProviders,
  comingSoonProviders,
  getStatus,
  getLastError,
  isAuthenticated,
  onConnect,
  onClose
}) => {
  const renderStatusLabel = (providerId: CalendarProviderId) => {
    const status = getStatus(providerId);
    if (status === 'connecting') return 'Redirecting…';
    if (status === 'connected' && isAuthenticated(providerId)) return 'Connected';
    return 'Connect';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full mx-4 p-8 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Choose your calendar provider</h2>
            <p className="text-sm text-slate-600 mt-1">We’ll take you through the secure OAuth flow to grant CalFix access.</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 text-slate-500 hover:text-slate-700 flex items-center justify-center rounded-full border border-slate-200"
            aria-label="Close provider selection"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {implementedProviders.map(provider => {
            const status = getStatus(provider.id);
            const connected = status === 'connected' && isAuthenticated(provider.id);
            const lastError = getLastError(provider.id);

            return (
              <div key={provider.id} className="border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{provider.label}</h3>
                    <p className="text-sm text-slate-500">{provider.description}</p>
                  </div>
                  {providerBrandIcons[provider.id] ? (
                    <img src={providerBrandIcons[provider.id]!} alt={`${provider.label} logo`} className="h-10 w-10" />
                  ) : (
                    <span className="text-3xl" role="img" aria-label={provider.label}>
                      📆
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <CapabilityBadge enabled={provider.capabilities.supportsConferenceLinks} label="Video links" />
                  <CapabilityBadge enabled={provider.capabilities.supportsFreeBusy} label="Free/busy" />
                  <CapabilityBadge enabled={provider.capabilities.supportsBuffers} label="Automation" />
                </div>

                <button
                  onClick={() => onConnect(provider.id)}
                  className={`w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                    : 'bg-indigo-600 text-white shadow hover:bg-indigo-700'}
                  `}
                  disabled={connected || status === 'connecting'}
                >
                  {renderStatusLabel(provider.id)}
                </button>

                {connected && (
                  <p className="text-sm text-emerald-600">Connected. You can switch providers at any time.</p>
                )}

                {lastError && !connected && (
                  <p className="text-sm text-red-600">{lastError}</p>
                )}
              </div>
            );
          })}
        </div>

        {comingSoonProviders.length > 0 && (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Coming soon</h3>
            <div className="flex flex-wrap gap-3">
              {comingSoonProviders.map(provider => (
                <span key={provider.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-200 text-sm text-slate-600">
                  🛠️ {provider.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CapabilityBadge: React.FC<{ enabled: boolean; label: string }> = ({ enabled, label }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${enabled ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-400 bg-white'}`}>
    {enabled ? '✅' : '⚙️'} {label}
  </span>
);

export default CalendarConnectPrompt;
