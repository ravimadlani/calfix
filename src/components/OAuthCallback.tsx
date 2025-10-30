import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '../services/googleAuth';

export function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const processOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/dashboard?oauth_error=' + error);
        return;
      }

      if (code) {
        try {
          console.log('[OAuthCallback] Processing OAuth code...');
          await handleCallback(code);
          console.log('[OAuthCallback] OAuth successful, redirecting to dashboard...');

          // Navigate to dashboard with success flag
          navigate('/dashboard?oauth_success=true');
        } catch (error) {
          console.error('[OAuthCallback] OAuth callback error:', error);
          navigate('/dashboard?oauth_error=failed');
        }
      } else {
        // No code or error, just redirect to dashboard
        navigate('/dashboard');
      }
    };

    processOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Connecting Google Calendar...</h2>
        <p className="text-gray-600">Please wait while we complete the authorization.</p>
      </div>
    </div>
  );
}