# Authentication Options Documentation

## Overview

This Microsoft Entra ID OBO Flow Demo implements three different authentication approaches for accessing Microsoft Graph API. Each option has different security characteristics and use cases.

## Option A: Direct Token Flow

### Description
Frontend calls Microsoft Graph directly using the user's access token.

### Architecture
```
User → Frontend → Microsoft Entra ID → Frontend → Microsoft Graph API
```

### Implementation Details
- **Frontend Scopes**: Direct Microsoft Graph scopes (e.g., `https://graph.microsoft.com/User.Read`)
- **Token Flow**: Frontend → Microsoft Graph API (direct)
- **Security**: ⚠️ Basic - tokens exposed on client-side

### Pros
- ✅ Simple implementation
- ✅ Fewer moving parts
- ✅ Quick to set up

### Cons
- ❌ Token exposed on client-side
- ❌ Limited security
- ❌ Not suitable for production

### Use Cases
- Prototyping
- Simple client-side applications
- Educational demos

---

## Option B: Pure OBO Flow ✅ **CURRENT IMPLEMENTATION**

### Description
Backend uses On-Behalf-Of (OBO) flow to exchange user token for delegated access tokens.

### Architecture
```
User → Frontend → Microsoft Entra ID → Frontend → Backend API → Microsoft Entra ID → Backend API → Microsoft Graph API
```

### Implementation Details
- **Frontend Scopes**: Custom API scope (`api://client-id/access_as_user`)
- **Token Flow**: Frontend → Backend → OBO Exchange → Microsoft Graph API
- **Security**: ✅ High - server-side token handling

### Configuration

#### Frontend Authentication Config
```typescript
export const loginRequest: PopupRequest = {
    scopes: [
        `api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}/access_as_user`
    ],
    prompt: "select_account"
};
```

#### Backend OBO Exchange
```python
async def exchange_token_via_obo(user_token: str, scopes: list) -> str:
    result = msal_app.acquire_token_on_behalf_of(
        user_assertion=user_token,
        scopes=scopes
    )
    return result["access_token"]
```

### Required Azure App Registration Setup
1. **Expose an API**: Set Application ID URI to `api://client-id`
2. **Add Scope**: Create `access_as_user` scope
3. **API Permissions**: Add Microsoft Graph delegated permissions
4. **Client Secret**: Create and configure client secret

### Pros
- ✅ Secure server-side token handling
- ✅ Production-ready architecture
- ✅ Follows Microsoft best practices
- ✅ Better audit trail and logging
- ✅ Supports long-running operations

### Cons
- ❌ More complex implementation
- ❌ Requires proper API scope configuration
- ❌ Additional backend infrastructure

### Use Cases
- Production applications
- Enterprise solutions
- Applications requiring high security
- Server-side processing scenarios

---

## Option C: Hybrid OBO Flow

### Description
Backend attempts OBO flow first, falls back to direct token access if OBO fails.

### Architecture
```
User → Frontend → Microsoft Entra ID → Frontend → Backend API → [OBO Flow OR Direct Graph API]
```

### Implementation Details
- **Frontend Scopes**: Mixed (both custom API and Graph scopes)
- **Token Flow**: Hybrid approach with fallback logic
- **Security**: 🔶 Mixed - inconsistent security model

### Pros
- ✅ Flexible for development/testing
- ✅ Graceful degradation
- ✅ Useful during migration

### Cons
- ❌ Complex fallback logic
- ❌ Inconsistent security model
- ❌ Difficult to maintain
- ❌ Not suitable for production

### Use Cases
- Development environments
- Migration scenarios
- Testing different approaches

---

## Comparison Table

| Aspect | Option A: Direct Token | Option B: Pure OBO ✅ | Option C: Hybrid |
|--------|----------------------|-------------------|-------------------|
| **Security** | ⚠️ Client-side exposure | ✅ Server-side handling | 🔶 Mixed approach |
| **Complexity** | 🟢 Simple | 🔶 Moderate | 🔴 Complex |
| **Scalability** | 🔴 Limited | ✅ Excellent | 🔶 Good |
| **Maintenance** | 🟢 Easy | ✅ Structured | 🔴 Difficult |
| **Production Ready** | 🔴 No | ✅ Yes | ⚠️ Development only |
| **Microsoft Recommended** | ❌ No | ✅ Yes | ❌ No |

## Current Implementation Status

### ✅ Active Implementation: Option B (Pure OBO Flow)

**Frontend Configuration:**
- Uses custom API scope: `api://client-id/access_as_user`
- Single token acquisition for all backend calls
- Secure token storage in localStorage

**Backend Implementation:**
- Validates custom API scope tokens
- Exchanges tokens using OBO flow for specific Graph scopes
- No fallback mechanisms - pure OBO approach
- Comprehensive error handling with specific error messages

**Supported Microsoft Graph APIs:**
- User Profile (`User.Read`)
- User Profile Photo (`User.Read`)
- SharePoint Sites (`Sites.Read.All`)
- SharePoint Lists (`Sites.Read.All`)
- Calendar Events (`Calendars.Read`)
- Mail Messages (`Mail.Read`)
- OneDrive Files (`Files.Read`)
- Teams Memberships (`Team.ReadBasic.All`, `Group.Read.All`)

## Testing the Implementation

1. **Start Backend**: `cd backend && python main.py`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Access Application**: http://localhost:3000
4. **Sign In**: Use Microsoft account with proper permissions
5. **Test APIs**: Use the GraphApiDemo component to test each endpoint

## Troubleshooting

### Common Issues with Option B

1. **AADSTS50013 (Invalid Grant)**: 
   - Ensure API is properly exposed in Azure App Registration
   - Verify `access_as_user` scope is created and enabled

2. **Token Audience Mismatch**:
   - Check that frontend requests `api://client-id/access_as_user`
   - Verify backend validates correct audience

3. **OBO Flow Failures**:
   - Ensure client secret is correctly configured
   - Verify all Microsoft Graph permissions are granted
   - Check that admin consent is provided for delegated permissions

4. **Insufficient Permissions**:
   - Grant admin consent for all required Microsoft Graph permissions
   - Ensure user has appropriate licenses (e.g., SharePoint, Teams)

For detailed setup instructions, see:
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)
- [EXPOSE_API_SETUP_GUIDE.md](./EXPOSE_API_SETUP_GUIDE.md)
- [TROUBLESHOOTING_AADSTS500011.md](./TROUBLESHOOTING_AADSTS500011.md)
