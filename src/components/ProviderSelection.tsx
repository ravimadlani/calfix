import React, { useState } from 'react';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import type { CalendarProviderId } from '../types';

const ProviderSelection: React.FC = () => {
  const {
    providerMetadata,
    activeProviderId,
    setActiveProvider,
    signIn,
    signOut,
    isAuthenticated,
    getStatus,
    getLastError
  } = useCalendarProvider();

  const [isConnecting, setIsConnecting] = useState<CalendarProviderId | null>(null);

  const handleConnect = async (providerId: CalendarProviderId) => {
    try {
      setIsConnecting(providerId);
      setActiveProvider(providerId);
      await signIn(providerId);
    } catch (error) {
      console.error(`Failed to connect ${providerId}:`, error);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (providerId: CalendarProviderId) => {
    try {
      await signOut(providerId);
    } catch (error) {
      console.error(`Failed to disconnect ${providerId}:`, error);
    }
  };

  const getProviderIcon = (providerId: CalendarProviderId) => {
    switch (providerId) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'outlook':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#0078D4" d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z"/>
            <path fill="#ffffff" d="M12 5.5L7 7.5v4c0 3.3 2.2 6.4 5 7.2 2.8-.8 5-3.9 5-7.2v-4l-5-2z"/>
          </svg>
        );
      default:
        return <span className="w-5 h-5">📅</span>;
    }
  };

  const getStatusBadge = (providerId: CalendarProviderId) => {
    const status = getStatus(providerId);
    const isActive = providerId === activeProviderId;

    if (status === 'connected') {
      return (
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
              Active
            </span>
          )}
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            Connected
          </span>
        </div>
      );
    }

    if (status === 'connecting') {
      return (
        <span className="text-yellow-600">Connecting...</span>
      );
    }

    if (status === 'error') {
      const error = getLastError(providerId);
      return (
        <span className="text-red-600 text-sm">
          Error: {error || 'Connection failed'}
        </span>
      );
    }

    return <span className="text-gray-500">Not connected</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Calendar Providers</h2>
      <p className="text-sm text-gray-600 mb-6">
        Connect your calendar accounts to start managing them with CalFix.
      </p>

      <div className="space-y-4">
        {providerMetadata.map((provider) => {
          const isConnected = isAuthenticated(provider.id);
          const isActive = provider.id === activeProviderId;
          const isConnectingThis = isConnecting === provider.id;

          return (
            <div
              key={provider.id}
              className={`border rounded-lg p-4 transition-all ${
                isActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getProviderIcon(provider.id)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{provider.label}</h3>
                    {provider.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {provider.description}
                      </p>
                    )}
                    <div className="mt-2">
                      {getStatusBadge(provider.id)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isConnected ? (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={isConnectingThis}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isConnectingThis
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {isConnectingThis ? 'Connecting...' : 'Connect'}
                    </button>
                  ) : (
                    <>
                      {!isActive && (
                        <button
                          onClick={() => setActiveProvider(provider.id)}
                          className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
                        >
                          Set as Active
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Show capabilities */}
              {isConnected && provider.capabilities && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Features:</p>
                  <div className="flex flex-wrap gap-2">
                    {provider.capabilities.supportsBuffers && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">Buffer Events</span>
                    )}
                    {provider.capabilities.supportsFocusBlocks && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">Focus Blocks</span>
                    )}
                    {provider.capabilities.supportsConferenceLinks && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">Conference Links</span>
                    )}
                    {provider.capabilities.supportsFreeBusy && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">Free/Busy</span>
                    )}
                    {provider.capabilities.supportsLocationTracking && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">Location Tracking</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Multiple Provider Support</p>
            <p>You can connect multiple calendar providers and switch between them. Only one provider can be active at a time for calendar operations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderSelection;