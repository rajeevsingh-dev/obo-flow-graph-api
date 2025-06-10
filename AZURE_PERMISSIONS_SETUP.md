# Azure App Registration Permissions Setup Guide

This guide will help you configure the necessary permissions in your Azure app registration to resolve the `AADSTS65001` consent error.

## The Error Explained

The error `AADSTS65001: The user or administrator has not consented to use the application with ID '20e9f47b-7a60-4279-94d6-6a9684a16920'` indicates that:

1. **Missing Permissions**: Your Azure app registration doesn't have the required API permissions configured
2. **No Consent**: Users haven't consented to the permissions your app is requesting
3. **Admin Consent Required**: Some permissions require administrator consent

## Step-by-Step Solution

### 1. Navigate to Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "App registrations" or navigate to **Microsoft Entra ID** > **App registrations**
3. Find your app with ID `20e9f47b-7a60-4279-94d6-6a9684a16920`

### 2. Configure API Permissions

1. Click on your app registration
2. In the left sidebar, click **API permissions**
3. You should see current permissions listed

### 3. Add Required Microsoft Graph Permissions

Click **+ Add a permission** > **Microsoft Graph** > **Delegated permissions**

Add these permissions one by one:

#### Basic Permissions (Usually don't require admin consent)
- `User.Read` - Read user profile
- `openid` - Sign in and read user profile  
- `profile` - View basic profile
- `email` - View email address

#### Additional Permissions (May require admin consent)
- `Sites.Read.All` - Read items in all site collections
- `Calendars.Read` - Read user calendars
- `Mail.Read` - Read user mail
- `Files.Read` - Read user files
- `Team.ReadBasic.All` - Read the names and descriptions of teams
- `Group.Read.All` - Read all groups

### 4. Grant Admin Consent

**Option A: Admin Consent (Recommended)**
1. After adding all permissions, click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. You should see green checkmarks next to all permissions

**Option B: User Consent (If admin consent not available)**
1. Users will be prompted to consent when they first use the app
2. Some permissions may not work without admin consent

### 5. Verify Configuration

Your API permissions should look like this:

| API / Permissions name | Type | Description | Admin consent required | Status |
|------------------------|------|-------------|------------------------|---------|
| Microsoft Graph / User.Read | Delegated | Sign in and read user profile | No | ✅ Granted |
| Microsoft Graph / Sites.Read.All | Delegated | Read items in all site collections | Yes | ✅ Granted |
| Microsoft Graph / Calendars.Read | Delegated | Read user calendars | No | ✅ Granted |
| Microsoft Graph / Mail.Read | Delegated | Read user mail | No | ✅ Granted |
| Microsoft Graph / Files.Read | Delegated | Read user files | No | ✅ Granted |
| Microsoft Graph / Team.ReadBasic.All | Delegated | Read the names and descriptions of teams | Yes | ✅ Granted |
| Microsoft Graph / Group.Read.All | Delegated | Read all groups | Yes | ✅ Granted |

## Step 6: Expose API for OBO Flow

**Critical for OBO Flow**: Your app registration must expose an API scope that the frontend can request.

1. **Navigate to Expose an API**
   ```
   Your App → Expose an API
   ```

2. **Set Application ID URI**
   - Click **Add** next to Application ID URI
   - Accept the default format: `api://{client-id}` 
   - Example: `api://20e9f47b-7a60-4279-94d6-6a9684a16920`
   - Click **Save**

3. **Add a Scope**
   - Click **+ Add a scope**
   - Scope name: `access_as_user`
   - Admin consent display name: `Access application as a user`
   - Admin consent description: `Allow the application to access the API on behalf of the signed-in user`
   - User consent display name: `Access application as you`
   - User consent description: `Allow the application to access the API on your behalf`
   - State: **Enabled**
   - Click **Add scope**

4. **Authorize Client Applications** (Optional)
   - If your frontend is a separate app registration, add its client ID here
   - For single app registration (frontend + backend), this step is not needed

5. **Verify Configuration**
   Your exposed API should show:
   ```
   Application ID URI: api://20e9f47b-7a60-4279-94d6-6a9684a16920
   Scopes defined by this API:
   - api://20e9f47b-7a60-4279-94d6-6a9684a16920/access_as_user
   ```

### 7. Update API Permissions

After exposing the API, update your API permissions:

1. **Navigate to API Permissions**
2. **Add the exposed API scope**:
   - Click **+ Add a permission**
   - Go to **My APIs** tab
   - Select your application
   - Select **Delegated permissions**
   - Check `access_as_user`
   - Click **Add permissions**

3. **Final permissions list should include**:
   ```
   Microsoft Graph / User.Read (Delegated)
   Microsoft Graph / Sites.Read.All (Delegated) 
   [Your App] / access_as_user (Delegated)
   ```

4. **Grant admin consent for all permissions**

## Alternative Solutions

### If You Don't Have Admin Access

If you cannot grant admin consent, you have a few options:

1. **Request Admin Consent**: Contact your IT administrator and share this guide
2. **Use Basic Permissions Only**: Modify the app to only use permissions that don't require admin consent
3. **Create Personal App**: Create a new app registration under a personal Microsoft account

### If You Want to Test with Limited Permissions

You can start with just these basic permissions that don't require admin consent:
- `User.Read`
- `openid`
- `profile`
- `email`

Update your `authConfig.ts`:

```typescript
export const loginRequest: PopupRequest = {
    scopes: [
        "User.Read",
        "openid",
        "profile",
        "email"
    ],
    prompt: "consent"
};
```

## Testing the Fix

1. **Clear Browser Cache**: Clear your browser cache and cookies for the application
2. **Sign Out and Sign In**: If already signed in, sign out completely and sign in again
3. **Test API Calls**: Try each Graph API endpoint to verify permissions are working

## Troubleshooting

### Still Getting AADSTS65001?
- Double-check that admin consent was granted (green checkmarks)
- Verify the Client ID in your `.env` files matches the app registration
- Clear browser cache and try again
- Check that the app registration is in the correct tenant

### Some APIs Still Failing?
- Some APIs require additional permissions not listed here
- Check the specific error message for the required permission
- Refer to [Microsoft Graph permissions reference](https://docs.microsoft.com/en-us/graph/permissions-reference)

### User Consent Prompts?
- If users see consent prompts, it means permissions aren't pre-consented
- Grant admin consent to avoid user prompts
- Or accept that users will need to consent individually

## Security Best Practices

1. **Principle of Least Privilege**: Only request permissions your app actually needs
2. **Regular Review**: Periodically review and remove unused permissions  
3. **Monitor Usage**: Use Azure AD logs to monitor permission usage
4. **Document Permissions**: Keep this documentation updated when adding new features

## Next Steps

After resolving the consent issue:
1. Test the basic authentication flow
2. Test each Graph API endpoint individually
3. Implement proper error handling for permission-related errors
4. Consider implementing incremental consent for better user experience

## Useful Links

- [Azure App Registration Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph Permissions Reference](https://docs.microsoft.com/en-us/graph/permissions-reference)
- [Admin Consent Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-admin-consent)
- [Troubleshooting AADSTS Errors](https://docs.microsoft.com/en-us/azure/active-directory/develop/reference-aadsts-error-codes)
