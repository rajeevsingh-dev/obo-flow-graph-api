## Troubleshooting

### Authentication Issues

#### AADSTS65001: Consent Required Error
If you see the error "The user or administrator has not consented to use the application", follow these steps:

1. **Check App Registration Permissions**:
   - Go to Azure Portal > App registrations > Your App > API permissions
   - Ensure all required Microsoft Graph permissions are added
   - Grant admin consent for the organization

2. **Required Permissions**:
   ```
   Microsoft Graph (Delegated):
   - User.Read (Sign in and read user profile)
   - Sites.Read.All (Read SharePoint sites) - Requires admin consent
   [Your App] (Delegated):
   - access_as_user (Access application as user)
   ```

3. **Grant Admin Consent**:
   - In API permissions, click "Grant admin consent for [Organization]"
   - All permissions should show green checkmarks when granted

4. **For detailed setup instructions, see**: [Azure Permissions Setup](/Help/AZURE_PERMISSIONS_SETUP.md)

#### AADSTS50013: Signature Validation Failed (OBO Flow)
This error occurs when the OBO token exchange fails:

1. **Check API Exposure**:
   - Ensure your app exposes an API with scope `access_as_user`
   - Application ID URI should be `api://{your-client-id}`

2. **Verify Token Audience**:
   - Frontend should request `api://{client-id}/access_as_user` scope
   - Backend should validate token audience matches your application

3. **Check Environment Variables**:
   - Ensure CLIENT_ID matches your Azure app registration
   - Verify AZURE_CLIENT_SECRET is correct and not expired

#### AADSTS500011: The Resource Principle Was Not Found in the Tenant
This error occurs when deploying the application in a different tenant than where it was originally registered:

1. **Error Description**:   ```
   AADSTS500011: The resource principal named api://CLIENT-ID was not found in the tenant named TENANT-NAME
   ```

2. **Root Cause**:
   - The frontend tries to request a token for a custom API scope (`api://{client-id}/access_as_user`)
   - This API resource doesn't exist in the customer's tenant
   - This happens when your OBO flow application is accessed by users in different tenants
   - The service principal for your API application is missing in their tenant

3. **Solution - Option 1: New App Registration in Customer Tenant**:
   - The customer must create a new app registration in their tenant:
     ```
     Azure Portal > Microsoft Entra ID > App registrations > New registration
     ```
   - Configure same settings as in original tenant:
     - Name: OBO Flow Demo (or any name)
     - Account types: Single tenant
     - Redirect URI: http://localhost:3000 (SPA)

4. **Critical: Expose an API**:
   - In App Registration > Expose an API:
     - Set Application ID URI to: `api://{client-id}`
     - Add scope named: `access_as_user`
     - Enable the scope
     - Provide admin consent

5. **Configure Required Settings**:
   - Add Microsoft Graph API Permissions: `User.Read` and `Sites.Read.All`
   - Create Client Secret
   - Configure Authentication (SPA platform)
   - Grant admin consent

6. **Update Environment Files**:
   - Update backend `.env`:     ```
     AZURE_CLIENT_ID=CLIENT-ID
     AZURE_TENANT_ID=TENANT-ID
     AUTHORITY=https://login.microsoftonline.com/TENANT-ID
     AZURE_CLIENT_SECRET=CLIENT-SECRET-VALUE
     ```
   - Update frontend `.env.local`:     ```
     NEXT_PUBLIC_AZURE_CLIENT_ID=CLIENT-ID
     NEXT_PUBLIC_AZURE_TENANT_ID=TENANT-ID
     ```

7. **Solution - Option 2: Multi-tenant Configuration**:
   - If your application needs to work across multiple tenants:
     - Update your app registration to support multi-tenant auth
     - In Azure Portal > App registrations > Authentication > Supported account types
     - Select "Accounts in any organizational directory"
   - The admin in customer tenant must explicitly consent to the application

8. **Solution - Option 3: Switch to Direct Token Access**:
   - For simpler deployment, consider removing the OBO flow:
   - Update frontend to request standard Microsoft Graph scopes directly:
     - `https://graph.microsoft.com/User.Read`
     - `https://graph.microsoft.com/Sites.Read.All`
   - Update backend to accept and validate these tokens
   - This approach requires less configuration but sacrifices some security benefits of OBO

9. **Verification Steps**:
   - In App Registration > Expose an API - Is the Application ID URI set correctly?
   - In App Registration > API permissions - Are all required permissions granted?
   - In Enterprise applications - Can they find your application?
   - Check that the API application ID URI matches exactly what the frontend is requesting

#### Azure Portal UI Error: "Failed to retrieve the blade definition for 'WebApiBlade'"

If you see this error when trying to access the "Expose an API" blade in the Azure Portal:

```
Error: Failed to retrieve the blade definition for 'WebApiBlade' from the server.
Couldn't load "RegisteredApps/Applications/ViewModels/WebApiBlade"; error code 0
```

This is a UI rendering issue in the Azure Portal, not an issue with your actual application registration. Try these solutions:

1. **Try a different browser** (Edge, Chrome, Firefox)
2. **Clear your browser cache and cookies**:
   - For Chrome: Press Ctrl+Shift+Del
   - Select "Cookies and site data" and "Cached images and files"
   - Click "Clear data"
3. **Use InPrivate/Incognito mode**
4. **Try the legacy Azure Portal experience**:
   - Visit: https://portal.azure.com/?feature.customportal=false
5. **Use Microsoft Entra admin center instead**:
   - Visit: https://entra.microsoft.com
   - Navigate to "Applications" > "App registrations" > Your app

If you need to configure via command line instead (Azure CLI):
```powershell
# Set API exposure for your app
az ad app update --id CLIENT-ID --identifier-uris "api://CLIENT-ID"

# Add the scope
az ad app update --id CLIENT-ID --oauth2-permissions '[{"adminConsentDescription":"Allow the application to access the API on behalf of the signed-in user","adminConsentDisplayName":"Access application as a user","id":"SCOPE-ID","isEnabled":true,"type":"User","userConsentDescription":"Allow the application to access the API on your behalf","userConsentDisplayName":"Access application as you","value":"access_as_user"}]'
```

#### Token Acquisition Errors
- Clear browser cache and cookies
- Sign out completely and sign back in
- Check that environment variables match your Azure app registration

#### Network/CORS Issues
- Ensure backend is running on the correct port (5000)
- Verify CORS settings in backend allow frontend origin
- Check firewall settings if running on different machines

### API Issues
- **403 Forbidden**: Check that the required permissions are granted in Azure
- **404 Not Found**: Verify the API endpoints are correct
- **500 Internal Server Error**: Check the backend logs for detailed error messages

### Common Solutions
1. **Restart Both Services**: Stop and restart both frontend and backend
2. **Clear Browser Data**: Clear cache, cookies, and local storage
3. **Check Environment Variables**: Verify all environment variables are correctly set
4. **Review Azure Configuration**: Double-check client ID, tenant ID, and permissions

#### AADSTS160021: Interaction Required Error
If you see the error "Application requested a user session which does not exist":

1. **Root Cause**:
   - This occurs when the token has expired or been invalidated
   - The user needs to re-authenticate interactively

2. **Solution**:
   - Clear browser cache and cookies for the domain
   - Sign out completely from the application
   - Sign in again with fresh credentials
   - If using incognito/private mode, try a regular browser window

3. **Prevention**:
   - Implement proper token refresh mechanisms in your code
   - Set appropriate token lifetime policies in Azure AD
   - Handle token expiration gracefully in the application

#### "block_nested_popups" Error

If you see "Request was blocked inside a popup because MSAL detected it was running in a popup":

1. **Root Cause**:
   - This happens when MSAL tries to open a popup from within another popup
   - Browsers block nested popups for security reasons
   - Often occurs in complex authentication flows or iframe scenarios

2. **Solution**:
   - The application should detect if it's running in a popup or iframe context
   - When in popup context, use redirect flow instead of another popup
   - Implement smart context detection:
     ```typescript
     // Smart context detection
     const isInIframe = window.self !== window.top;
     const isInPopup = window.opener !== null;
     
     const loginMethod = (isInIframe || isInPopup) 
       ? "redirect" // Use redirect in nested contexts
       : "popup";   // Default to popup in main window
     ```

3. **Implementation**:
   - Add fallback strategy (try popup, fall back to redirect if blocked)
   - Enhance error handling to provide clear messages
   - Add user feedback during authentication flow transitions

#### Permission-Specific Errors for Microsoft Graph API

##### Files.Read.All Consent Issues

If certain SharePoint operations work but file content operations fail:

1. **Working Operations** (with Sites.Read.All):
   - SharePoint Sites listing
   - Document Libraries (listings only)
   - SharePoint Lists
   - Site Pages
   - Site Navigation

2. **Failing Operations** (requiring Files.Read.All):
   - File Content Reading
   - Recent Files

3. **Solution**:
   - Verify that Files.Read.All permission is added to your app registration
   - Grant admin consent specifically for Files.Read.All
   - Wait 5-10 minutes for the consent to propagate
   - For testing, you can trigger user consent directly:     ```
     https://login.microsoftonline.com/TENANT-ID/oauth2/v2.0/authorize?client_id=CLIENT-ID&response_type=code&scope=https://graph.microsoft.com/Files.Read.All&redirect_uri=REDIRECT-URI
     ```

#### General Microsoft Graph API Errors

1. **401 Unauthorized**:
   - Check that your token is valid and not expired
   - Verify you're requesting the correct scopes
   - Ensure consent has been granted for all required permissions

2. **403 Forbidden**:
   - The authenticated user doesn't have permission to access the resource
   - Check that admin consent has been granted for admin-only permissions
   - Verify that the user has necessary permissions in SharePoint

3. **404 Not Found**:
   - The SharePoint site or resource doesn't exist
   - Check the site URL and resource paths
   - Verify the user has access to the site in SharePoint

4. **429 Too Many Requests**:
   - You've exceeded Microsoft Graph API rate limits
   - Implement proper throttling and retry logic
   - Add exponential backoff to your requests

## Detailed Permission Setup Guide for AADSTS65001 Error

If you're seeing the AADSTS65001 consent error and need detailed steps, follow this guide:

### 1. Configure API Permissions in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** > **App registrations**
3. Find and select your application
4. Click on **API permissions** in the left sidebar

### 2. Add Microsoft Graph Permissions

Click **+ Add a permission** > **Microsoft Graph** > **Delegated permissions**

Add these permissions:

#### Essential Permissions
- `User.Read` - Read user profile
- `Sites.Read.All` - Read items in all site collections

#### Additional Permissions (If needed)
- `Files.Read.All` - Required for reading file content
- `openid` - Sign in users
- `profile` - View basic profile
- `email` - View email address

### 3. Grant Admin Consent

1. After adding all permissions, click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. Verify that all permissions show green checkmarks (✓ Granted status)

### 4. Configure API for OBO Flow

1. Navigate to **Expose an API** in the left sidebar
2. Set **Application ID URI** to `api://{client-id}`
3. Add a scope:
   - Name: `access_as_user`
   - Admin consent display name: `Access application as a user`
   - Admin consent description: `Allow the application to access the API on behalf of the signed-in user`
   - User consent display name: `Access application as you`
   - User consent description: `Allow the application to access the API on your behalf`
   - State: **Enabled**

### 5. Update API Permissions Again

After exposing the API:

1. Go back to **API permissions**
2. Click **+ Add a permission**
3. Select **My APIs** tab
4. Select your application
5. Choose **Delegated permissions**
6. Check `access_as_user`
7. Click **Add permissions**
8. Grant admin consent again

### 6. Final Verification

Your API permissions should include:
- `Microsoft Graph / User.Read` (Delegated)
- `Microsoft Graph / Sites.Read.All` (Delegated)
- `[Your App] / access_as_user` (Delegated)

All permissions should show the "Granted" status with green checkmarks.

### 7. If Issues Persist

If you've completed all these steps and still encounter consent errors:
- Try signing out completely and signing back in
- Clear browser cache and cookies
- Check if you're using the correct tenant ID and client ID
- Verify that the account you're using has permission to access the requested resources

## Developer Troubleshooting

### Common Code and Configuration Errors

#### Frontend Issues

1. **Incorrect MSAL Configuration**:
   ```typescript
   // INCORRECT - Missing required scopes
   export const msalConfig = {
     auth: {
       clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
       // Missing authority
     }
   };

   // CORRECT
   export const msalConfig = {
     auth: {
       clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
       authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
       redirectUri: window.location.origin
     }
   };
   ```

2. **Invalid Scope Format**:
   ```typescript
   // INCORRECT - Malformed scope format
   const loginRequest = {
     scopes: ["api://client-id/access_as_user"]
   };

   // CORRECT
   const loginRequest = {
     scopes: [`api://${clientId}/access_as_user`]
   };
   ```

#### Backend Issues

1. **Missing Environment Variables**:
   - Check for complete `.env` file:
     ```
     AZURE_CLIENT_ID=CLIENT-ID
     AZURE_TENANT_ID=TENANT-ID
     AZURE_CLIENT_SECRET=CLIENT-SECRET-VALUE
     AUTHORITY=https://login.microsoftonline.com/TENANT-ID
     ```

2. **OBO Flow Implementation Errors**:
   ```python
   # INCORRECT - Missing validation
   def get_obo_token(auth_header):
       # Missing bearer token validation
       result = confidential_client.acquire_token_on_behalf_of(...)
       return result['access_token']

   # CORRECT
   def get_obo_token(auth_header):
       if not auth_header.startswith('Bearer '):
           return {"error": "Unauthorized, invalid token format"}
       token = auth_header.split(' ')[1]
       try:
           result = confidential_client.acquire_token_on_behalf_of(
               user_assertion=token,
               scopes=["https://graph.microsoft.com/.default"]
           )
           return result['access_token']
       except Exception as e:
           return {"error": f"Token acquisition failed: {str(e)}"}
   ```

### Environment Configuration Issues

1. **Missing CORS Configuration**:
   ```python
   # INCORRECT - No CORS handling
   app = Flask(__name__)

   # CORRECT
   app = Flask(__name__)
   CORS(app, supports_credentials=True)
   ```

2. **Incorrect Port Configuration**:
   - Frontend must be on port 3000 (default)
   - Backend must be on port 5000
   - Both must be registered in the Azure App Registration's redirect URIs

### Diagnostic Steps

1. **Check Network Requests**:
   - Open browser developer tools (F12)
   - Go to Network tab
   - Look for failing requests to:
     - Microsoft login endpoints (401/403 errors)
     - Your backend API (CORS or authentication errors)
     - Microsoft Graph API (permission errors)

2. **Check Console Errors**:
   - Look for MSAL-related errors
   - Token acquisition failures
   - CORS issues

3. **Backend Logging**:
   - Enable detailed logging in your backend
   - Add log statements before and after critical operations
   - Capture and log all exceptions

4. **Test Token Flow**:
   - Use tools like [jwt.ms](https://jwt.ms) to decode and inspect tokens
   - Verify correct audience, issuer, and scopes in tokens
   - Check token expiration times

## Troubleshooting Flowchart

Follow this step-by-step guide to diagnose and resolve issues:

```
START
  ↓
Is the application running locally?
  ├── NO → Check server/hosting environment
  |       → Verify network connectivity
  |       → Check firewall settings
  ↓ YES
Can you access the frontend at http://localhost:3000?
  ├── NO → Check if frontend service is running
  |       → Verify port 3000 is available
  |       → Review frontend console errors
  ↓ YES
Can you access the backend at http://localhost:5000?
  ├── NO → Check if backend service is running
  |       → Verify port 5000 is available
  |       → Review backend logs
  ↓ YES
Can you sign in to the application?
  ├── NO → Check error message:
  |       → AADSTS65001 (Consent) → Follow consent guide
  |       → AADSTS50011 (Invalid reply URL) → Check redirect URIs
  |       → AADSTS500011 (Resource not found) → Follow tenant setup guide
  |       → block_nested_popups → Follow popup blocking fix
  ↓ YES
Does User Info API work?
  ├── NO → Check User.Read permission is granted
  |       → Verify token acquisition in frontend
  |       → Check OBO flow implementation
  ↓ YES
Do SharePoint APIs work?
  ├── NO → Check which specific operation fails:
  |       → Sites listing → Check Sites.Read.All permission
  |       → File content → Check Files.Read.All permission
  |       → Check admin consent status
  |       → Check OBO token exchange in backend
  ↓ YES
Application working correctly!
  → If issues reappear, check for:
    → Token expiration
    → Permission changes
    → Environment changes
```

### Quick Resolution Guide

| Error Code | Primary Cause | First Solution to Try |
|------------|---------------|------------------------|
| AADSTS65001 | Missing consent | Grant admin consent in Azure Portal |
| AADSTS500011 | API not exposed in tenant | Register app in customer tenant or switch to direct token |
| AADSTS50011 | Invalid redirect URI | Add correct redirect URI in app registration |
| AADSTS50013 | Token validation failed | Verify client secret and audience |
| AADSTS160021 | Session expired | Re-authenticate user |
| block_nested_popups | Browser security | Use redirect instead of popup |
| CORS error | Backend configuration | Enable CORS for frontend origin |
| 401 Unauthorized | Invalid token | Check token acquisition flow |
| 403 Forbidden | Insufficient permissions | Grant additional permissions |

Refer this url for all error details: https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes

