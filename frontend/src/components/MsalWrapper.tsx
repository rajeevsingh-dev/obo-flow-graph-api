'use client';

import { useEffect, useState } from 'react';
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from '../config/authConfig';

const msalInstance = new PublicClientApplication(msalConfig);

export default function MsalWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        
        // Handle redirect result if coming back from authentication
        try {
          const response = await msalInstance.handleRedirectPromise();
          if (response) {
            console.log('Redirect authentication successful:', response);
          }
        } catch (redirectError) {
          console.log('Redirect handling error (non-critical):', redirectError);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize MSAL:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
      }
    };

    initializeMsal();
  }, []);

  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Initialization Failed</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  );
}