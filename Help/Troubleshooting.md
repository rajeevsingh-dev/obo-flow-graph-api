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

4. **For detailed setup instructions, see**: [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)

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

1. **Root Cause**:
   - The application is trying to request a token for `api://{client-id}` 
   - This API resource doesn't exist in the tenant where the application is being used
   - This is common when sharing the application with customers who use their own tenant

2. **Solution - New App Registration Required**:
   - The customer must create a new app registration in their tenant:
     ```
     Azure Portal > Microsoft Entra ID > App registrations > New registration
     ```
   - Configure same settings as in original tenant:
     - Name: OBO Flow Demo (or any name)
     - Account types: Single tenant
     - Redirect URI: http://localhost:3000 (SPA)

3. **Critical: Expose an API**:
   - In App Registration > Expose an API:
     - Set Application ID URI to: `api://{client-id}`
     - Add scope named: `access_as_user`
     - Enable the scope
     - Provide admin consent

4. **Configure Required Settings**:
   - Add Microsoft Graph API Permissions: `User.Read` and `Sites.Read.All`
   - Create Client Secret
   - Configure Authentication (SPA platform)
   - Grant admin consent

5. **Update Environment Files**:
   - Update backend `.env`: 
     ```
     AZURE_CLIENT_ID=their_client_id
     AZURE_TENANT_ID=their_tenant_id
     AUTHORITY=https://login.microsoftonline.com/their_tenant_id
     AZURE_CLIENT_SECRET=their_client_secret
     ```
   - Update frontend `.env.local`:
     ```
     NEXT_PUBLIC_AZURE_CLIENT_ID=their_client_id
     NEXT_PUBLIC_AZURE_TENANT_ID=their_tenant_id
     ```

6. **Verification Steps**:
   - In App Registration > Expose an API - Is the Application ID URI set?
   - In App Registration > App roles & API scopes - Is the `access_as_user` scope visible?
   - In Enterprise applications - Can they see their registered app?

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

Error
interaction_required: AADSTS160021: Application requested a user session which does not exist. Trace ID: 7b619f81-1d93-4844-9414-e88768fc6700 Correlation ID: 01977979-fd1c-7ba3-8b12-d713a39484de Timestamp: 2025-06-16 16:02:08Z


