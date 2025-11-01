import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import type { CalendarProviderId } from '../types';

export function OAuthCallback() {
  const navigate = useNavigate();
  const { handleCallback, setActiveProvider, activeProviderId } = useCalendarProvider();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) {
      return;
    }
    processedRef.current = true;

    const processOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const providerParam = urlParams.get('provider') as CalendarProviderId | null;
      const providerId = providerParam || activeProviderId;

      if (providerParam && providerParam !== activeProviderId) {
        setActiveProvider(providerParam);
      }

      if (error) {
        console.error('OAuth error:', error);
        navigate(`/dashboard?oauth_error=${error}&provider=${providerId}`);
        return;
      }

      if (code) {
        try {
          console.log('[OAuthCallback] Processing OAuth code...');
          await handleCallback(providerId, code);
          console.log('[OAuthCallback] OAuth successful, redirecting to dashboard...');

          // Navigate to dashboard with success flag
          navigate(`/dashboard?oauth_success=true&provider=${providerId}`);
        } catch (error) {
          console.error('[OAuthCallback] OAuth callback error:', error);
          navigate(`/dashboard?oauth_error=failed&provider=${providerId}`);
        }
      } else {
        // No code or error, just redirect to dashboard
        navigate('/dashboard');
      }
    };

    processOAuthCallback();
  }, [activeProviderId, handleCallback, navigate, setActiveProvider]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Connecting Google Calendar...</h2>
        <p className="text-gray-600">Please wait while we complete the authorization.</p>
      </div>
    </div>
  );
}
