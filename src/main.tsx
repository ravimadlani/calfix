/**
 * Entry Point
 * Renders the React application with Clerk authentication provider
 */

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { CalendarProviderContextProvider } from './context/CalendarProviderContext';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key');
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <BrowserRouter>
        <CalendarProviderContextProvider>
          <App />
        </CalendarProviderContextProvider>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>
);
