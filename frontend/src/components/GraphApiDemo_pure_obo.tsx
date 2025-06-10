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
    },
    {
        name: 'Calendar Events',
        endpoint: '/api/graph/calendar',
        description: 'Get calendar events via Pure OBO Flow',
        icon: '📅'
    },
    {
        name: 'Mail Messages',
        endpoint: '/api/graph/mail',
        description: 'Get mail messages via Pure OBO Flow',
        icon: '📧'
    },
    {
        name: 'OneDrive Files',
        endpoint: '/api/graph/files',
        description: 'Get OneDrive files via Pure OBO Flow',
        icon: '📁'
    },
    {
        name: 'Teams Memberships',
        endpoint: '/api/graph/teams',
        description: 'Get Teams memberships via Pure OBO Flow',
        icon: '👥'
    }
];

const GraphApiDemo: React.FC = () => {
    const { instance, accounts } = useMsal();
    const [responses, setResponses] = useState<Record<string, ApiResponse | null>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string | null>>({});

    const callGraphApi = async (service: GraphApiService) => {
        if (accounts.length === 0) {
            setErrors(prev => ({ ...prev, [service.name]: 'No authenticated account found' }));
            return;
        }

        setLoading(prev => ({ ...prev, [service.name]: true }));
        setErrors(prev => ({ ...prev, [service.name]: null }));

        try {
            // For Pure OBO Flow, we always use the custom API scope
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
                        scopes: oboScopes.api,
                        account: accounts[0],
                        prompt: 'select_account'
                    };

                    const response = await instance.acquireTokenPopup(popupRequest);
                    accessToken = response.accessToken;
                } catch (popupError) {
                    console.error('Popup token acquisition failed:', popupError);
                    throw new Error(`Authentication failed: ${popupError instanceof Error ? popupError.message : 'Unknown error'}`);
                }
            }

            // Call the backend API with the custom API token
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
                    errorMessage = 'Authentication failed. Please ensure custom API scope is configured correctly.';
                } else if (apiResponse.status === 403) {
                    errorMessage = 'Insufficient permissions. OBO flow may require additional consent.';
                } else if (errorText.includes('AADSTS50013')) {
                    errorMessage = 'OBO flow failed. Check that API is properly exposed and consented.';
                } else if (errorText.includes('invalid_grant')) {
                    errorMessage = 'Invalid token for OBO flow. Please sign in again.';
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
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Pure OBO Flow Demo - Microsoft Graph API
                </h2>
                <p className="text-gray-600 mb-4">
                    Test comprehensive Microsoft Graph API access using Pure On-Behalf-Of (OBO) flow with custom API scope.
                </p>
                <div className="flex space-x-4">
                    <button
                        onClick={clearAllResponses}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                        Clear All Responses
                    </button>
                    <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm">
                        🔐 Pure OBO Flow - Production Ready
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {graphServices.map((service) => (
                    <div key={service.name} className="bg-white rounded-lg shadow-md border border-gray-200">
                        <div className="p-4">
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
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-sm"
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
                                    <p className="text-xs text-red-700">{errors[service.name]}</p>
                                </div>
                            )}

                            {responses[service.name] && (
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Response:</h4>
                                    <div className="max-h-40 overflow-y-auto">
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
                    🔐 Pure OBO Flow Architecture
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                        <h4 className="font-semibold mb-2">Frontend Authentication:</h4>
                        <ul className="space-y-1">
                            <li>• Uses custom API scope: <code className="bg-blue-100 px-1 rounded">api://client-id/access_as_user</code></li>
                            <li>• Single token for all backend API calls</li>
                            <li>• Secure token management in localStorage</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Backend OBO Flow:</h4>
                        <ul className="space-y-1">
                            <li>• Exchanges custom API token for Graph tokens</li>
                            <li>• Request-specific Microsoft Graph scopes</li>
                            <li>• Server-side token handling (secure)</li>
                        </ul>
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-100 rounded-md">
                    <h4 className="font-semibold text-blue-900 mb-2">Required Permissions:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-900">
                        <div>
                            <strong>Microsoft Graph (Delegated):</strong>
                            <ul className="mt-1 space-y-1">
                                <li>• User.Read</li>
                                <li>• Sites.Read.All</li>
                                <li>• Calendars.Read</li>
                                <li>• Mail.Read</li>
                            </ul>
                        </div>
                        <div>
                            <strong>Additional Permissions:</strong>
                            <ul className="mt-1 space-y-1">
                                <li>• Files.Read</li>
                                <li>• Team.ReadBasic.All</li>
                                <li>• Group.Read.All</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-md">
                    <p className="text-sm text-green-900">
                        <strong>✅ Production Ready:</strong> This implementation follows Microsoft's recommended security practices 
                        for server-side applications accessing Microsoft Graph API on behalf of users.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GraphApiDemo;
