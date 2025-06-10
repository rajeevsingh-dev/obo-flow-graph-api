'use client';

import { Configuration, PopupRequest } from "@azure/msal-browser";

// MSAL configuration
export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
        redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
        postLogoutRedirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000",
        navigateToLoginRequestUrl: false
    },    cache: {
        cacheLocation: "localStorage", // Change to localStorage for better persistence
        storeAuthStateInCookie: false,
    },
    system: {
        allowNativeBroker: false,
        windowHashTimeout: 15000,  // Increased timeout
        iframeHashTimeout: 15000,  // Increased timeout
        loadFrameTimeout: 15000,   // Increased timeout
        allowRedirectInIframe: true,  // Allow redirects in iframe
        loggerOptions: {
            loggerCallback: (level: any, message: any, containsPii: any) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case 0:
                        console.error(message);
                        return;
                    case 1:
                        console.warn(message);
                        return;
                    default:
                        return;
                }
            },
            logLevel: 1
        }
    }
};

// Login request with custom API scope for OBO flow
export const loginRequest: PopupRequest = {
    scopes: [
        `api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}/access_as_user`
    ],
    prompt: "select_account"
};

// Silent login request for token refresh
export const silentRequest = {
    scopes: [`api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}/access_as_user`]
};

// OBO Flow configuration - Frontend requests custom API scope
// Backend will use OBO flow to exchange for Microsoft Graph scopes
export const oboScopes = {
    // Custom API scope that enables OBO flow
    api: [`api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}/access_as_user`]
};

// API endpoints
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphSitesEndpoint: "https://graph.microsoft.com/v1.0/sites/root"
};

// API configuration
export const apiConfig = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
};
