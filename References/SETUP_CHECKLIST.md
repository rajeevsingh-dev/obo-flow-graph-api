# Azure App Registration Setup Checklist for OBO Flow

This checklist ensures your Azure app registration is properly configured for the On-Behalf-Of (OBO) flow.

## ✅ Pre-Setup Requirements

- [ ] Azure subscription with access to Microsoft Entra ID
- [ ] Application Administrator or Global Administrator role
- [ ] Client ID, Tenant ID, and Client Secret from your app registration

## ✅ Step 1: Basic App Registration

1. **App Registration Created**
   - [ ] Name: "OBO Flow Demo" (or your preferred name)
   - [ ] Account types: Single tenant (recommended) or Multi-tenant
   - [ ] Platform: Single-page application (SPA)
   - [ ] Redirect URI: `http://localhost:3000`

## ✅ Step 2: Authentication Configuration

1. **Platform Configuration**
   - [ ] Single-page application platform added
   - [ ] Redirect URIs: `http://localhost:3000`
   - [ ] Front-channel logout URL: `http://localhost:3000`

2. **Token Configuration**
   - [ ] Access tokens (used for implicit flows): ✅ Enabled
   - [ ] ID tokens (used for implicit and hybrid flows): ✅ Enabled

## ✅ Step 3: Expose an API (CRITICAL for OBO)

1. **Application ID URI**
   - [ ] Set to: `api://{your-client-id}`
   - [ ] Example: `api://20e9f47b-7a60-4279-94d6-6a9684a16920`

2. **Scopes Defined**
   - [ ] Scope name: `access_as_user`
   - [ ] Admin consent display name: "Access application as a user"
   - [ ] Admin consent description: "Allow the application to access the API on behalf of the signed-in user"
   - [ ] User consent display name: "Access application as you"
   - [ ] User consent description: "Allow the application to access the API on your behalf"
   - [ ] State: Enabled

3. **Verify Exposed API**
   ```
   Application ID URI: api://20e9f47b-7a60-4279-94d6-6a9684a16920
   Scopes: api://20e9f47b-7a60-4279-94d6-6a9684a16920/access_as_user
   ```

## ✅ Step 4: API Permissions

1. **Microsoft Graph Permissions**
   - [ ] `User.Read` (Delegated) - Read user profile
   - [ ] `Sites.Read.All` (Delegated) - Read SharePoint sites

2. **Your Application Permissions**
   - [ ] `{your-app}/access_as_user` (Delegated) - Access application as user

3. **Admin Consent**
   - [ ] All permissions show "Granted for {organization}"
   - [ ] Green checkmarks visible for all permissions

## ✅ Step 5: Certificates & Secrets

1. **Client Secret**
   - [ ] Client secret created
   - [ ] Secret value copied and stored securely
   - [ ] Expiration set (24 months recommended)

## ✅ Step 6: Environment Configuration

1. **Backend .env file**
   ```env
   AZURE_CLIENT_ID=your_client_id_here
   AZURE_TENANT_ID=your_tenant_id_here
   AUTHORITY=https://login.microsoftonline.com/your_tenant_id_here
   AZURE_CLIENT_SECRET=your_client_secret_here
   PORT=5000
   HOST=localhost
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

2. **Frontend .env.local file**
   ```env
   NEXT_PUBLIC_AZURE_CLIENT_ID=your_client_id_here
   NEXT_PUBLIC_AZURE_TENANT_ID=your_tenant_id_here
   NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

## ✅ Step 7: Testing Configuration

1. **Test Authentication Flow**
   - [ ] User can sign in successfully
   - [ ] No consent errors (AADSTS65001)
   - [ ] Access token acquired with correct audience

2. **Test OBO Flow**
   - [ ] Backend can exchange user token for Graph token
   - [ ] No signature validation errors (AADSTS50013)
   - [ ] Graph API calls succeed

## 🔧 Troubleshooting Common Issues

### AADSTS65001: Consent Required
- **Cause**: Missing permissions or admin consent not granted
- **Solution**: Add required permissions and grant admin consent

### AADSTS50013: Signature Validation Failed
- **Cause**: Wrong token audience or missing API exposure
- **Solution**: Ensure API is exposed and correct scopes are requested

### 403 Forbidden on Graph API calls
- **Cause**: Insufficient permissions
- **Solution**: Add required Graph permissions and grant admin consent

### Token audience mismatch
- **Cause**: Frontend requesting wrong scopes
- **Solution**: Request `api://{client-id}/access_as_user` scope

## 📋 Configuration Values Template

Replace these values in your configuration:

```
Client ID: ________________________________
Tenant ID: ________________________________
Client Secret: ____________________________
Application ID URI: api://________________/
API Scope: api://________________/access_as_user
```

## ✅ Final Verification

- [ ] All checklist items completed
- [ ] Environment files configured
- [ ] Application starts without errors
- [ ] Authentication flow works end-to-end
- [ ] OBO flow exchanges tokens successfully
- [ ] Graph API calls return data

---

**Need Help?** 
- Check the detailed setup guide: [AZURE_PERMISSIONS_SETUP.md](./AZURE_PERMISSIONS_SETUP.md)
- Review the troubleshooting section in [README.md](./README.md)
- Verify your configuration matches the Azure best practices
