'use client';

import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/authConfig';
import GraphApiDemo from '../components/GraphApiDemo';

interface UserData {
  message: string;
  id_token_claims?: {
    name: string;
    email: string;
    oid: string;
    preferred_username: string;
    given_name: string;
    family_name: string;
  };
  user_info?: {
    name: string;
    email: string;
    oid: string;
    preferred_username: string;
    given_name: string;
    family_name: string;
  };
}

export default function Home() {
  const { instance, accounts } = useMsal();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'graph'>('profile');

  useEffect(() => {
    if (accounts.length > 0) {
      fetchUserData();
    }
  }, [accounts]);  const fetchUserData = async () => {
    setLoading(true);
    try {
      console.log('Attempting to fetch user data via Pure OBO Flow...');
      console.log('Accounts:', accounts);
      
      if (accounts.length === 0) {
        throw new Error('No authenticated accounts found');
      }

      console.log('Requesting custom API scope token for account:', accounts[0].username);
      
      // Use custom API scope for Pure OBO Flow
      const token = await instance.acquireTokenSilent({
        scopes: [`api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}/access_as_user`],
        account: accounts[0]
      });

      console.log('Token acquired successfully');
      console.log('Access token length:', token.accessToken ? token.accessToken.length : 'null');
      console.log('Access token preview:', token.accessToken ? token.accessToken.substring(0, 50) + '...' : 'null');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      setUserData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };  const handleLogin = () => {
    // Check if we're in a popup context to avoid nested popups
    const isInPopup = window.opener !== null && window.opener !== window;
    const isInIframe = window.self !== window.top;
    
    if (isInPopup || isInIframe) {
      // Use redirect if in popup/iframe context
      instance.loginRedirect({
        ...loginRequest,
        prompt: 'select_account'
      }).catch((error: any) => {
        console.error('Login redirect error:', error);
        setError(error instanceof Error ? error.message : 'Login failed');
      });
    } else {
      // Try popup first, fallback to redirect if blocked
      instance.loginPopup({
        ...loginRequest,
        prompt: 'select_account'
      }).catch((error: any) => {
        console.error('Login popup error:', error);
        
        if (error.errorCode === 'user_cancelled') {
          setError('Login was cancelled by user');
        } else if (error.errorCode === 'block_nested_popups' || 
                   (error.errorMessage && error.errorMessage.includes('popup'))) {
          // Popup was blocked, try redirect
          console.log('Popup blocked, trying redirect...');
          instance.loginRedirect({
            ...loginRequest,
            prompt: 'select_account'
          }).catch((redirectError: any) => {
            console.error('Login redirect fallback error:', redirectError);
            setError(redirectError instanceof Error ? redirectError.message : 'Login failed');
          });
        } else if (error.errorMessage && error.errorMessage.includes('AADSTS65001')) {
          setError('Admin consent required. Please contact your administrator to grant permissions for this application.');
        } else {
          setError(error instanceof Error ? error.message : 'Login failed');
        }
      });
    }
  };

  const handleLogout = () => {
    instance.logoutPopup().catch((error: any) => {
      setError(error instanceof Error ? error.message : 'Logout failed');
    });
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Microsoft Entra ID Delegates Demo - OBO Flow
          </h1>
          <p className="text-gray-600 mb-6">
            Demonstrating Microsoft Graph API access using On-Behalf-Of (OBO) flow with custom API scope
          </p>
          
          {!accounts.length ? (
            <div className="text-center py-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Welcome to the Delegates Demo
              </h2>
              <p className="text-gray-600 mb-6">
                Sign in with your Microsoft account to access Graph API services
              </p>
              <button
                onClick={handleLogin}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In with Microsoft
              </button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Welcome, {accounts[0].name || accounts[0].username}
                  </h2>
                  <p className="text-gray-600">
                    Account: {accounts[0].username}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'profile'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    User Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('graph')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'graph'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Graph API Demo
                  </button>
                </nav>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-1 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content */}
              {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Basic User Information
                  </h3>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading user data...</span>
                    </div>
                  ) : userData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userData.user_info && (
                          <>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2">Display Name</h4>
                              <p className="text-gray-700">{userData.user_info.name}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2">Email</h4>
                              <p className="text-gray-700">{userData.user_info.email}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2">Given Name</h4>
                              <p className="text-gray-700">{userData.user_info.given_name}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2">Family Name</h4>
                              <p className="text-gray-700">{userData.user_info.family_name}</p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-2">Complete Response</h4>
                        <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(userData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No user data available</p>
                      <button
                        onClick={fetchUserData}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Fetch User Data
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'graph' && <GraphApiDemo />}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}