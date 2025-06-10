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
    requiresParameters?: boolean;
    parameters?: Array<{
        name: string;
        description: string;
        required: boolean;
        placeholder?: string;
    }>;
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
        description: 'Get detailed user information via OBO Flow',
        icon: '👤'
    },
    {
        name: 'SharePoint Sites',
        endpoint: '/api/sharepoint/sites',
        description: 'Access SharePoint sites via OBO Flow',
        icon: '🏢'
    },    {
        name: 'Document Libraries',
        endpoint: '/api/sharepoint/libraries',
        description: 'Get SharePoint document libraries and files. Can search for specific files to get their IDs.',
        icon: '📚',
        requiresParameters: false,
        parameters: [
            {
                name: 'site_id',
                description: 'SharePoint site ID or domain (optional - defaults to root site)',
                required: false,
                placeholder: 'e.g., mngenvmcap293807.sharepoint.com'
            },
            {
                name: 'search_name',
                description: 'Search for files by name (optional - helps find your document)',
                required: false,
                placeholder: 'e.g., Document for demo.docx'
            }
        ]
    },
    {
        name: 'SharePoint Lists',
        endpoint: '/api/sharepoint/lists',
        description: 'Get SharePoint lists and their items',
        icon: '📋'
    },
    {
        name: 'Site Pages',
        endpoint: '/api/sharepoint/pages',
        description: 'Get SharePoint site pages and content',
        icon: '📄'
    },
    {
        name: 'Site Navigation',
        endpoint: '/api/sharepoint/navigation',
        description: 'Get SharePoint site structure and navigation',
        icon: '🧭'
    },    {
        name: 'Recent Files',
        endpoint: '/api/sharepoint/recent',
        description: 'Get recently accessed SharePoint files',
        icon: '🕒'
    },    {
        name: 'File Content Reader',
        endpoint: '/api/sharepoint/file-content',
        description: 'Read actual content from SharePoint files. Leave file_id empty to browse available files, or use search_name to find specific files.',
        icon: '📄🔍',
        requiresParameters: false,
        parameters: [
            {
                name: 'file_id',
                description: 'SharePoint file ID (optional - leave empty to browse files)',
                required: false,
                placeholder: 'e.g., 01ABCDEF123456789...'
            },
            {
                name: 'site_id',
                description: 'SharePoint site ID or domain (optional - defaults to root site)',
                required: false,
                placeholder: 'e.g., mngenvmcap293807.sharepoint.com'
            },
            {
                name: 'search_name',
                description: 'Search for files by name (optional - helps find your document)',
                required: false,
                placeholder: 'e.g., Document for demo.docx'
            }
        ]
    },
    {
        name: 'Page Content Reader',
        endpoint: '/api/sharepoint/page-content',
        description: 'Read actual HTML content from SharePoint pages. First get page IDs from Site Pages, then use them here.',
        icon: '🌐🔍',
        requiresParameters: false,
        parameters: [
            {
                name: 'page_id',
                description: 'SharePoint page ID (get from Site Pages endpoint first)',
                required: true,
                placeholder: 'e.g., 123 or page-name.aspx'
            },
            {
                name: 'site_id',
                description: 'SharePoint site ID (optional - defaults to root site)',
                required: false,
                placeholder: 'e.g., contoso.sharepoint.com,12345...'
            }
        ]
    }
];

const GraphApiDemo: React.FC = () => {
    const { instance, accounts } = useMsal();
    const [responses, setResponses] = useState<Record<string, ApiResponse | null>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});    const [errors, setErrors] = useState<Record<string, string | null>>({});    const [parameters, setParameters] = useState<Record<string, Record<string, string>>>({});
    const [showParameters, setShowParameters] = useState<Record<string, boolean>>({
        'File Content Reader': true,  // Auto-show for File Content Reader
        'Page Content Reader': true   // Auto-show for Page Content Reader
    });

    const updateParameter = (serviceName: string, paramName: string, value: string) => {
        setParameters(prev => ({
            ...prev,
            [serviceName]: {
                ...prev[serviceName],
                [paramName]: value
            }
        }));
    };

    const toggleParameters = (serviceName: string) => {
        setShowParameters(prev => ({
            ...prev,
            [serviceName]: !prev[serviceName]
        }));
    };

    const clearResponse = (serviceName: string) => {
        setResponses(prev => ({ ...prev, [serviceName]: null }));
        setErrors(prev => ({ ...prev, [serviceName]: null }));
    };

    const callGraphApi = async (service: GraphApiService) => {
        if (accounts.length === 0) {
            setErrors(prev => ({ ...prev, [service.name]: 'No authenticated account found' }));
            return;
        }

        setLoading(prev => ({ ...prev, [service.name]: true }));
        setErrors(prev => ({ ...prev, [service.name]: null }));        try {
            // For OBO Flow, we always use the custom API scope
            let accessToken: string;
              try {
                const silentRequest = {
                    scopes: oboScopes.api,
                    account: accounts[0]
                };

                const response = await instance.acquireTokenSilent(silentRequest);
                accessToken = response.accessToken;
            } catch (silentError) {
                console.log('Silent token acquisition failed:', silentError);
                
                // Check if we're in a popup context
                const isInPopup = window.opener !== null && window.opener !== window;
                const isInIframe = window.self !== window.top;
                
                if (isInPopup || isInIframe) {
                    // If we're in a popup or iframe, use redirect instead
                    console.log('Detected popup/iframe context, using redirect flow');
                    try {
                        const redirectRequest = {
                            scopes: oboScopes.api,
                            account: accounts[0],
                            prompt: 'select_account'
                        };
                        
                        // Use redirect flow to avoid nested popup issues
                        await instance.acquireTokenRedirect(redirectRequest);
                        return; // Exit function as redirect will reload the page
                    } catch (redirectError) {
                        console.error('Redirect token acquisition failed:', redirectError);
                        throw new Error(`Authentication failed: Please sign in again. Error: ${redirectError instanceof Error ? redirectError.message : 'Unknown error'}`);
                    }
                } else {
                    // Try popup only if not in popup/iframe context
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
                        
                        // If popup fails, try redirect as fallback
                        if (popupError instanceof Error && popupError.message.includes('popup')) {
                            console.log('Popup blocked, falling back to redirect');
                            try {
                                const redirectRequest = {
                                    scopes: oboScopes.api,
                                    account: accounts[0],
                                    prompt: 'select_account'
                                };
                                
                                await instance.acquireTokenRedirect(redirectRequest);
                                return; // Exit function as redirect will reload the page
                            } catch (redirectError) {
                                console.error('Fallback redirect failed:', redirectError);
                                throw new Error(`Authentication failed: ${redirectError instanceof Error ? redirectError.message : 'Unknown error'}`);
                            }
                        } else {
                            throw new Error(`Authentication failed: ${popupError instanceof Error ? popupError.message : 'Unknown error'}`);
                        }
                    }
                }
            }// Build URL with parameters if any are provided
            let url = `${apiConfig.baseUrl}${service.endpoint}`;
            const serviceParams = parameters[service.name] || {};
            const queryParams = new URLSearchParams();
            
            // Add non-empty parameters to query string
            Object.entries(serviceParams).forEach(([key, value]) => {
                if (value && value.trim()) {
                    queryParams.append(key, value.trim());
                }
            });
            
            if (queryParams.toString()) {
                url += `?${queryParams.toString()}`;
            }

            // Call the backend API with the custom API token
            const apiResponse = await fetch(url, {
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
            }));        } finally {
            setLoading(prev => ({ ...prev, [service.name]: false }));
        }
    };

    const clearAllResponses = () => {
        setResponses({});
        setErrors({});
    };

    return (        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    OBO Flow Demo - Microsoft Graph & SharePoint Content API
                </h2>
                <p className="text-gray-600 mb-4">
                    Test Microsoft Graph and comprehensive SharePoint content reading using On-Behalf-Of (OBO) flow. Read actual file contents, page HTML, and SharePoint data.
                </p>
                <div className="flex space-x-4">
                    <button
                        onClick={clearAllResponses}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                        Clear All Responses
                    </button>
                    <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md text-sm">
                        🔐 OBO Flow Implementation
                    </div>                </div>
            </div>

            {/* Helpful ID Discovery Guide */}
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="p-4">
                    <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center">
                        🎯 Quick Start: Finding Your File & Page IDs
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                📄 For File Content Reading:
                            </h4>
                            <ol className="text-sm text-gray-700 space-y-1">
                                <li><strong>1.</strong> Click "SharePoint Sites" → Copy your site's <code className="bg-gray-100 px-1 rounded">id</code></li>
                                <li><strong>2.</strong> Click "Document Libraries" → Find your file → Copy its <code className="bg-gray-100 px-1 rounded">id</code></li>
                                <li><strong>3.</strong> Use both IDs in "File Content Reader"</li>
                            </ol>
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                <strong>Note:</strong> Don't use document GUIDs from URLs - use the actual Graph API file IDs
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                🌐 For Page Content Reading:
                            </h4>
                            <ol className="text-sm text-gray-700 space-y-1">
                                <li><strong>1.</strong> Click "Site Pages" → Find your page → Copy page <code className="bg-gray-100 px-1 rounded">id</code></li>
                                <li><strong>2.</strong> Use page ID in "Page Content Reader"</li>
                                <li><strong>3.</strong> Pages are .aspx files, not documents (.docx)</li>
                            </ol>
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <strong>Tip:</strong> For documents, use "File Content Reader" instead
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comprehensive Graph API Permissions Documentation */}
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                        🔐 Required Microsoft Graph API Permissions
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <h4 className="font-semibold text-gray-900 mb-3">🧑‍💼 User & Profile Permissions</h4>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <strong>User.Read</strong><br/>
                                        <span className="text-gray-600">Read user profile and basic information</span>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <strong>User.ReadBasic.All</strong><br/>
                                        <span className="text-gray-600">Read basic user information for all users</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <h4 className="font-semibold text-gray-900 mb-3">🌐 SharePoint & Sites Permissions</h4>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <strong>Sites.Read.All</strong><br/>
                                        <span className="text-gray-600">Read SharePoint sites, lists, and site collections</span>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <strong>Sites.ReadWrite.All</strong> <span className="text-orange-600">(Optional)</span><br/>
                                        <span className="text-gray-600">Enhanced SharePoint access for future features</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <h4 className="font-semibold text-gray-900 mb-3">📁 Files & Content Permissions</h4>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <strong>Files.Read.All</strong><br/>
                                        <span className="text-gray-600">Read file contents, metadata, and download files</span>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <div>
                                        <strong>Files.ReadWrite.All</strong> <span className="text-orange-600">(Optional)</span><br/>
                                        <span className="text-gray-600">Enhanced file access for future features</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <h4 className="font-semibold text-gray-900 mb-3">🔄 OBO Flow Configuration</h4>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start">
                                    <span className="text-blue-600 mr-2">⚙️</span>
                                    <div>
                                        <strong>Custom API Scope</strong><br/>
                                        <span className="text-gray-600">api://&lt;client-id&gt;/access_as_user</span>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-blue-600 mr-2">🔐</span>
                                    <div>
                                        <strong>Backend Token Exchange</strong><br/>
                                        <span className="text-gray-600">Server exchanges custom token for Graph API tokens</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start">
                            <span className="text-yellow-600 mr-2 mt-0.5">⚠️</span>
                            <div className="text-sm">
                                <strong className="text-yellow-800">Admin Consent Required:</strong>
                                <span className="text-yellow-700"> Some permissions (Sites.Read.All, Files.Read.All) require admin consent in your Azure AD tenant. Contact your administrator if you encounter consent errors.</span>
                            </div>
                        </div>
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

                            {/* Parameter inputs for services that need them */}
                            {service.parameters && service.parameters.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">Parameters:</span>
                                        <button
                                            onClick={() => toggleParameters(service.name)}
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                        >
                                            {showParameters[service.name] ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    
                                    {showParameters[service.name] && (
                                        <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            {service.parameters.map((param) => (
                                                <div key={param.name}>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        {param.name}
                                                        {param.required && <span className="text-red-500 ml-1">*</span>}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder={param.placeholder || `Enter ${param.name}`}
                                                        value={parameters[service.name]?.[param.name] || ''}
                                                        onChange={(e) => updateParameter(service.name, param.name, e.target.value)}
                                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

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
                            )}                            {responses[service.name] && (
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                    {/* Special handling for File Content Reader to show actual content prominently */}
                                    {service.name === 'File Content Reader' && responses[service.name]?.file_content?.content && (
                                        <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center mb-3">
                                                <span className="text-2xl mr-2">📄</span>
                                                <div>
                                                    <h4 className="text-lg font-semibold text-green-900">File Content</h4>
                                                    <p className="text-sm text-green-700">
                                                        {responses[service.name]?.file_content?.file_metadata?.name || 'Unknown file'} 
                                                        ({responses[service.name]?.file_content?.size_mb || 0} MB)
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white border border-green-200 rounded-md p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-green-800">
                                                        Content Type: {responses[service.name]?.file_content?.content_type?.replace('_', ' ')?.toUpperCase() || 'UNKNOWN'}
                                                    </span>
                                                    {responses[service.name]?.file_content?.can_extract_text && (
                                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                            ✓ Text Extracted
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="max-h-64 overflow-y-auto bg-gray-50 border border-gray-200 rounded p-3">
                                                    <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
                                                        {responses[service.name]?.file_content?.content}
                                                    </pre>
                                                </div>
                                                
                                                {responses[service.name]?.file_content?.content && responses[service.name]?.file_content?.content && responses[service.name]!.file_content!.content!.length > 3000 && (
                                                    <p className="text-xs text-green-600 mt-2">
                                                        📝 Content truncated to first 3000 characters for display
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Special handling for Page Content Reader */}
                                    {service.name === 'Page Content Reader' && responses[service.name]?.page_content && (
                                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center mb-3">
                                                <span className="text-2xl mr-2">🌐</span>
                                                <div>
                                                    <h4 className="text-lg font-semibold text-blue-900">Page Content</h4>
                                                    <p className="text-sm text-blue-700">
                                                        Page ID: {responses[service.name]?.page_id || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white border border-blue-200 rounded-md p-3">
                                                <div className="max-h-64 overflow-y-auto bg-gray-50 border border-gray-200 rounded p-3">
                                                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                                                        {typeof responses[service.name]?.page_content === 'string' 
                                                            ? responses[service.name]!.page_content 
                                                            : JSON.stringify(responses[service.name]?.page_content, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Full API Response:</h4>
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
            </div>            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    🔐 OBO Flow Architecture
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
                            <li>• Server-side token handling</li>
                        </ul>
                    </div>
                </div>                <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-md">
                    <h4 className="font-semibold text-green-900 mb-2">📄 Content Reading Capabilities:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-green-900">
                        <div>
                            <strong>Supported File Types:</strong>
                            <ul className="mt-1 space-y-1">
                                <li>• Text files (.txt, .md, .csv, .json)</li>
                                <li>• Office docs (.docx, .xlsx, .pptx)</li>
                                <li>• Web files (.html, .xml)</li>
                            </ul>
                        </div>
                        <div>
                            <strong>Content Extraction:</strong>
                            <ul className="mt-1 space-y-1">
                                <li>• Raw text content from documents</li>
                                <li>• SharePoint page HTML content</li>
                                <li>• List data and field values</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GraphApiDemo;
