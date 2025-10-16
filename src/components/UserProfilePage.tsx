import { UserProfile } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export function UserProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <UserProfile routing="path" path="/profile" />
      </div>
    </div>
  );
}
