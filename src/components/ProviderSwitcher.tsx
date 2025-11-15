import React, { useState } from 'react';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import type { CalendarProviderId } from '../types';

const ProviderSwitcher: React.FC = () => {
  const {
    providerMetadata,
    activeProviderId,
    setActiveProvider,
    isAuthenticated,
    getStatus
  } = useCalendarProvider();

  const [isOpen, setIsOpen] = useState(false);

  // Only show connected providers
  const connectedProviders = providerMetadata.filter(p => isAuthenticated(p.id));

  // Don't show switcher if only one or no providers connected
  if (connectedProviders.length <= 1) {
    return null;
  }

  const activeProviderMeta = providerMetadata.find(p => p.id === activeProviderId);

  const getProviderIcon = (providerId: CalendarProviderId) => {
    switch (providerId) {
      case 'google':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'outlook':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#0078D4" d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z"/>
            <path fill="#ffffff" d="M12 5.5L7 7.5v4c0 3.3 2.2 6.4 5 7.2 2.8-.8 5-3.9 5-7.2v-4l-5-2z"/>
          </svg>
        );
      default:
        return <span className="w-4 h-4">📅</span>;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {getProviderIcon(activeProviderId)}
        <span className="text-sm font-medium">{activeProviderMeta?.label}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-2">
              <p className="px-3 py-2 text-xs text-gray-500 font-medium">SWITCH PROVIDER</p>
              {connectedProviders.map(provider => {
                const isActive = provider.id === activeProviderId;
                const status = getStatus(provider.id);

                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setActiveProvider(provider.id);
                      setIsOpen(false);
                    }}
                    disabled={isActive}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-50 cursor-default'
                        : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    {getProviderIcon(provider.id)}
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-900'}`}>
                        {provider.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {status === 'connected' ? 'Connected' : 'Available'}
                      </p>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to settings or show provider management modal
                  window.location.href = '/settings#providers';
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Providers
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProviderSwitcher;