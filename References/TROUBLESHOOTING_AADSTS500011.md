# Troubleshooting AADSTS500011 Error

## Error Description
```
AADSTS500011: The resource principal named api://20e9f47b-7a60-4279-94d6-6a9684a16920 was not found in the tenant
```

## Root Cause
This error occurs when the frontend tries to request a token for a custom API scope (`api://{client-id}/access_as_user`) that hasn't been properly configured in the Azure app registration.

## Solution Applied
We've simplified the application to use **direct token access** instead of the On-Behalf-Of (OBO) flow:

### Changes Made:

1. **Frontend Scopes Updated**
   - ✅ Now uses: `https://graph.microsoft.com/User.Read`
   - ✅ Now uses: `https://graph.microsoft.com/Sites.Read.All`
   - ❌ Removed: `api://{client-id}/access_as_user`

2. **Backend Implementation Updated**
   - ✅ Uses user tokens directly to call Microsoft Graph API
   - ❌ Removed: Complex OBO token exchange logic

3. **Benefits of This Approach**
   - ✅ Simpler configuration - no need to expose custom APIs
   - ✅ Standard Microsoft Graph permissions only
   - ✅ Faster response times (no token exchange)
   - ✅ Easier to troubleshoot

## Required Azure Configuration

### API Permissions (Delegated)
1. **Microsoft Graph / User.Read** - ✅ No admin consent required
2. **Microsoft Graph / Sites.Read.All** - ⚠️ Requires admin consent

### Steps to Grant Admin Consent:
1. Go to Azure Portal → App registrations → Your App
2. Navigate to "API permissions"
3. Click "Grant admin consent for [Organization]"
4. Confirm the action
5. Verify all permissions show "Granted" status

## Testing the Fix

1. **Clear Browser Cache**: Clear cache and cookies for localhost:3000
2. **Sign Out**: If logged in, sign out completely
3. **Sign In**: Sign in again - you should see permission prompts for the new scopes
4. **Test APIs**: Both User Profile and SharePoint should work without OBO errors

## Alternative: Full OBO Implementation

If you need true OBO flow for enterprise scenarios, see [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) for complete Azure app registration configuration including API exposure.

---
**Status**: ✅ Fixed - Application now uses direct token access instead of OBO flow
