'use client';

import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { apiConfig, oboScopes } from '../config/authConfig';

interface ApiResponse {
    message: string;
    [key: string]: any;
}

interface GraphApiService {
    name: string;
    endpoint: string;
    description: string;
    icon: string;
    scopes?: string[];
}

const graphServices: GraphApiService[] = [
    {
        name: 'User Token Claims',
        endpoint: '/api/user',
        description: 'Get basic user information from custom API token claims',
        icon: '🎫'
    },
    {
        name: 'Graph User Profile',
        endpoint: '/api/graph/user',
        description: 'Get detailed user information via Pure OBO Flow',
        icon: '👤'
    },
    {
        name: 'User Profile Photo',
        endpoint: '/api/graph/user/photo',
        description: 'Get user profile photo metadata via Pure OBO Flow',
        icon: '📷'
    },
    {
        name: 'SharePoint Sites',
        endpoint: '/api/sharepoint/sites',
        description: 'Access SharePoint sites via Pure OBO Flow',
        icon: '🏢'
    },    // Calendar Events, Mail Messages, OneDrive Files, Teams Memberships endpoints removed - not implemented in current version
];

const GraphApiDemo: React.FC = () => {
    const { instance, accounts } = useMsal();
    const [responses, setResponses] = useState<Record<string, ApiResponse | null>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string | null>>({});    const callGraphApi = async (service: GraphApiService) => {
        if (accounts.length === 0) {
            setErrors(prev => ({ ...prev, [service.name]: 'No authenticated account found' }));
            return;
        }

        setLoading(prev => ({ ...prev, [service.name]: true }));
        setErrors(prev => ({ ...prev, [service.name]: null }));        try {
            // Get access token with the appropriate scopes for this service
            let accessToken: string;
            
            try {
                const silentRequest = {
                    scopes: oboScopes.api,
                    account: accounts[0]
                };

                const response = await instance.acquireTokenSilent(silentRequest);
                accessToken = response.accessToken;
            } catch (silentError) {
                console.log('Silent token acquisition failed, trying popup:', silentError);
                
                try {
                    const popupRequest = {
                        scopes: service.scopes,
                        account: accounts[0],
                        prompt: 'select_account'  // Changed from 'consent' to reduce prompts
                    };

                    const response = await instance.acquireTokenPopup(popupRequest);
                    accessToken = response.accessToken;
                } catch (popupError) {
                    console.error('Popup token acquisition failed:', popupError);
                    throw new Error(`Authentication failed: ${popupError instanceof Error ? popupError.message : 'Unknown error'}`);
                }
            }

            // Call the backend API
            const apiResponse = await fetch(`${apiConfig.baseUrl}${service.endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                let errorMessage = `HTTP ${apiResponse.status}: ${errorText}`;
                
                if (apiResponse.status === 401) {
                    errorMessage = 'Authentication failed. Please sign in again.';
                } else if (apiResponse.status === 403) {
                    errorMessage = 'Insufficient permissions. Admin consent may be required.';
                } else if (errorText.includes('AADSTS65001')) {
                    errorMessage = 'Consent required. Please grant permissions to access this resource.';
                }
                
                throw new Error(errorMessage);
            }

            const data = await apiResponse.json();
            setResponses(prev => ({ ...prev, [service.name]: data }));

        } catch (error) {
            console.error(`Error calling ${service.name}:`, error);
            setErrors(prev => ({ 
                ...prev, 
                [service.name]: error instanceof Error ? error.message : 'Unknown error occurred' 
            }));
        } finally {
            setLoading(prev => ({ ...prev, [service.name]: false }));
        }
    };

    const clearResponse = (serviceName: string) => {
        setResponses(prev => ({ ...prev, [serviceName]: null }));
        setErrors(prev => ({ ...prev, [serviceName]: null }));
    };

    const clearAllResponses = () => {
        setResponses({});
        setErrors({});
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Microsoft Graph API Demo
                </h2>                <p className="text-gray-600 mb-4">
                    Test User Profile and SharePoint access using OBO flow with direct token fallback.
                </p>
                <button
                    onClick={clearAllResponses}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                    Clear All Responses
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {graphServices.map((service) => (
                    <div key={service.name} className="bg-white rounded-lg shadow-md border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center mb-3">
                                <span className="text-2xl mr-3">{service.icon}</span>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {service.name}
                                </h3>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-4">
                                {service.description}
                            </p>

                            <div className="flex space-x-2 mb-4">
                                <button
                                    onClick={() => callGraphApi(service)}
                                    disabled={loading[service.name]}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    {loading[service.name] ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading...
                                        </span>
                                    ) : (
                                        'Test API'
                                    )}
                                </button>
                                
                                {(responses[service.name] || errors[service.name]) && (
                                    <button
                                        onClick={() => clearResponse(service.name)}
                                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                                        title="Clear response"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {errors[service.name] && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <h4 className="text-sm font-medium text-red-800 mb-1">Error:</h4>
                                    <p className="text-sm text-red-700">{errors[service.name]}</p>
                                </div>
                            )}

                            {responses[service.name] && (
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Response:</h4>
                                    <div className="max-h-60 overflow-y-auto">
                                        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                                            {JSON.stringify(responses[service.name], null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    🔧 Required Permissions
                </h3>                <div className="space-y-2 text-sm text-blue-800">
                    <p>• <strong>Graph User Profile:</strong> Uses https://graph.microsoft.com/User.Read permission with OBO flow + fallback</p>
                    <p>• <strong>SharePoint Sites:</strong> Uses https://graph.microsoft.com/Sites.Read.All permission with OBO flow + fallback (requires admin consent)</p>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-md">
                    <p className="text-sm text-blue-900">
                        <strong>Architecture:</strong> The backend first attempts OBO flow to exchange your token for a Graph API token. 
                        If OBO fails (due to missing API configuration), it falls back to using your token directly with Microsoft Graph API.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GraphApiDemo;