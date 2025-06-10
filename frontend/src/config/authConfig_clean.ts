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
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        allowNativeBroker: false,
        windowHashTimeout: 9000,
        iframeHashTimeout: 9000,
        loadFrameTimeout: 9000,
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

// Login request with minimal scopes
export const loginRequest: PopupRequest = {
    scopes: [
        "User.Read",
        "Sites.Read.All"
    ],
    prompt: "consent"
};

// Silent login request for token refresh
export const silentRequest = {
    scopes: ["User.Read", "profile", "email", "openid"]
};

// Graph API scopes for our two main services
export const graphScopes = {
    user: ["User.Read"],
    sharepoint: ["Sites.Read.All"]
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
