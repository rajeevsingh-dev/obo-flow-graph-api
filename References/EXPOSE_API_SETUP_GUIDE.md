# Azure App Registration: Expose an API Setup Guide

This guide provides detailed steps to configure "Expose an API" in your Azure App Registration, which is required for implementing the On-Behalf-Of (OBO) flow.

## Why Expose an API?

When you expose an API from your app registration, you're essentially:
1. **Creating a custom resource identifier** for your application
2. **Defining scopes** that other applications can request
3. **Enabling OBO flow** where your backend can exchange user tokens for Graph API tokens
4. **Establishing trust** between frontend and backend components

## Step-by-Step Setup

### Step 1: Navigate to Expose an API

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to**: Microsoft Entra ID → App registrations
3. **Select your app**: Click on your application (e.g., "OBO Flow Demo")
4. **Click**: "Expose an API" in the left sidebar

### Step 2: Set Application ID URI

The Application ID URI uniquely identifies your API in the tenant.

1. **Click**: "Add" next to "Application ID URI"
2. **Use the default format**: `api://{client-id}`
   - Example: `api://20e9f47b-7a60-4279-94d6-6a9684a16920`
   - Azure will auto-populate this with your client ID
3. **Alternative formats** (optional):
   - `api://myapp.contoso.com/{client-id}`
   - `https://myapp.contoso.com/{client-id}`
4. **Click**: "Save"

### Step 3: Add a Scope

Scopes define what permissions other applications can request.

1. **Click**: "+ Add a scope"
2. **Fill out the form**:

   | Field | Value | Description |
   |-------|-------|-------------|
   | **Scope name** | `access_as_user` | The name clients will request |
   | **Who can consent?** | `Admins and users` | Who can grant this permission |
   | **Admin consent display name** | `Access application as a user` | What admins see |
   | **Admin consent description** | `Allow the application to access the API on behalf of the signed-in user` | Detailed description for admins |
   | **User consent display name** | `Access application as you` | What users see |
   | **User consent description** | `Allow the application to access the API on your behalf` | Detailed description for users |
   | **State** | `Enabled` | Must be enabled |

3. **Click**: "Add scope"

### Step 4: Verify the Configuration

After adding the scope, you should see:

```
Application ID URI: api://20e9f47b-7a60-4279-94d6-6a9684a16920

Scopes defined by this API:
├── api://20e9f47b-7a60-4279-94d6-6a9684a16920/access_as_user
    ├── Type: User
    ├── Admin consent: Required
    ├── State: Enabled
```

### Step 5: Authorize Client Applications (Optional)

If your frontend is a separate app registration:

1. **Click**: "+ Add a client application"
2. **Enter**: Client ID of your frontend application
3. **Select**: The scope you just created (`access_as_user`)
4. **Click**: "Add application"

> **Note**: If using a single app registration for both frontend and backend, skip this step.

### Step 6: Update API Permissions

Now add the exposed API scope to your app's permissions:

1. **Navigate to**: "API permissions" in your app registration
2. **Click**: "+ Add a permission"
3. **Select**: "My APIs" tab
4. **Choose**: Your application name
5. **Select**: "Delegated permissions"
6. **Check**: `access_as_user`
7. **Click**: "Add permissions"
8. **Click**: "Grant admin consent for [your organization]"

### Step 7: Final Permissions List

Your API permissions should now include:

| API / Permissions name | Type | Description | Status |
|------------------------|------|-------------|--------|
| Microsoft Graph / User.Read | Delegated | Read user profile | ✅ Granted |
| Microsoft Graph / Sites.Read.All | Delegated | Read SharePoint sites | ✅ Granted |
| **[Your App] / access_as_user** | **Delegated** | **Access application as user** | **✅ Granted** |

## Update Your Code

Once the API is exposed, update your application code:

### Frontend Changes

Update `frontend/src/config/authConfig.ts`:

```typescript
// Add the custom scope to login request
export const loginRequest: PopupRequest = {
    scopes: [
        "User.Read",
        "api://20e9f47b-7a60-4279-94d6-6a9684a16920/access_as_user"  // Your custom scope
    ],
    prompt: "select_account"
};

// Update Graph API scopes
export const graphScopes = {
    user: ["api://20e9f47b-7a60-4279-94d6-6a9684a16920/access_as_user"],
    sharepoint: ["api://20e9f47b-7a60-4279-94d6-6a9684a16920/access_as_user"]
};
```

### Backend Changes

Update `backend/main.py`:

```python
async def get_bearer_token(authorization: str = Header(...)) -> str:
    """Extract and validate bearer token"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    # Validate token audience
    try:
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        aud = unverified_payload.get('aud')
        
        # Should be your application ID URI or client ID
        expected_audiences = [
            CLIENT_ID,
            f"api://{CLIENT_ID}"  # Your exposed API
        ]
        
        if aud not in expected_audiences:
            raise HTTPException(status_code=401, detail="Invalid token audience")
            
        return token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token validation failed")
```

## Testing the Setup

### 1. Test Token Acquisition

Your frontend should now request tokens with the custom scope:

```typescript
const response = await instance.acquireTokenSilent({
    scopes: ["api://20e9f47b-7a60-4279-94d6-6a9684a16920/access_as_user"],
    account: accounts[0]
});
```

### 2. Test OBO Flow

Your backend can now exchange the user token:

```python
result = msal_app.acquire_token_on_behalf_of(
    user_assertion=user_token,
    scopes=["https://graph.microsoft.com/User.Read"]
)
```

### 3. Verify Token Content

Check that your tokens have the correct audience:

```bash
# Decode the token at https://jwt.ms
# Look for:
{
  "aud": "api://20e9f47b-7a60-4279-94d6-6a9684a16920",
  "scp": "access_as_user",
  ...
}
```

## Common Issues

### Issue 1: AADSTS500011 - Resource not found
**Cause**: Application ID URI not set or incorrect scope requested
**Solution**: Verify the URI format matches exactly: `api://{client-id}`

### Issue 2: AADSTS65001 - Consent required
**Cause**: Admin consent not granted for the custom scope
**Solution**: Grant admin consent in API permissions

### Issue 3: AADSTS50013 - Signature validation failed
**Cause**: Token audience mismatch in OBO flow
**Solution**: Ensure backend validates correct audience

### Issue 4: Token has wrong audience
**Cause**: Frontend requesting wrong scope
**Solution**: Request the custom API scope, not Graph scopes directly

## Security Considerations

1. **Scope Naming**: Use descriptive, clear scope names
2. **Consent**: Require admin consent for sensitive operations
3. **Token Validation**: Always validate audience and scopes in backend
4. **Least Privilege**: Only expose necessary scopes
5. **Regular Review**: Audit and update scopes as needed

## Alternatives

If you don't want to set up API exposure, consider:

1. **Direct Token Access**: Use Graph tokens directly (simpler)
2. **Client Credentials Flow**: For service-to-service scenarios
3. **Managed Identity**: For Azure-hosted applications

## Summary

Setting up "Expose an API" enables:
- ✅ Proper OBO flow implementation
- ✅ Token audience validation
- ✅ Fine-grained permission control
- ✅ Enterprise-grade security patterns

The setup requires:
1. Setting Application ID URI
2. Defining custom scopes
3. Granting permissions
4. Updating application code

This provides a foundation for scalable, secure authentication patterns in your application.
