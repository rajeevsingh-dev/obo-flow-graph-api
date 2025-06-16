# Microsoft Entra ID Delegated Access Patterns

This document explains the different approaches to implementing delegated access in Microsoft Entra ID applications, their use cases, advantages, and considerations.

## Overview

Delegated access is a security pattern where an application acts on behalf of a signed-in user. This document covers three main implementation approaches:

1. On-Behalf-Of (OBO) Flow
2. Token Validation + Direct API
3. Proxy Pattern

## 1. On-Behalf-Of (OBO) Flow

### Implementation
```python
# Backend receives user token and exchanges for Graph API token
app.acquire_token_on_behalf_of(
    user_assertion=user_token,
    scopes=["https://graph.microsoft.com/User.Read"]
)
```

### Use Cases
- When your backend needs to access Microsoft Graph API
- When you need to maintain user context in backend operations
- When you need to access multiple Microsoft services with different scopes
- When you need to perform long-running operations on behalf of the user

### Advantages
- Maintains user context throughout the entire flow
- Can access multiple Microsoft services with different scopes
- Supports long-running operations
- Follows Microsoft's recommended pattern for service-to-service calls

### Considerations
- Requires additional token exchange
- More complex to implement
- Higher latency due to token exchange
- Requires proper error handling for token exchange failures

## 2. Token Validation + Direct API

### Implementation
```python
# Validate user token and use it directly
decoded_token = jwt.decode(token, public_key, algorithms=["RS256"])
# Use token claims for user information
```

### Use Cases
- When you only need user information from the token
- When you don't need to access Microsoft Graph API
- When performance is critical
- When you want to minimize API calls to Microsoft services

### Advantages
- Simpler implementation
- Lower latency (no token exchange)
- Reduced complexity
- Direct access to user claims
- Better performance

### Considerations
- Limited to information available in the token
- Cannot access Microsoft Graph API directly
- May need to refresh tokens more frequently
- Requires proper token validation

## 3. Proxy Pattern

### Implementation
```python
# Backend acts as a proxy to Microsoft Graph
requests.get("https://graph.microsoft.com/v1.0/me", 
           headers={"Authorization": f"Bearer {user_token}"})
```

### Use Cases
- When you need to access Microsoft Graph API occasionally
- When you want to hide API complexity from the frontend
- When you need to add custom logic before/after API calls
- When you want to implement caching or rate limiting

### Advantages
- Simple to implement
- Direct access to Microsoft Graph API
- Can add custom logic in the proxy
- Can implement caching and rate limiting
- Frontend doesn't need to handle API complexity

### Considerations
- Security considerations for token handling
- Need to handle token expiration
- May need to implement retry logic
- Requires proper error handling

## Comparison Table

| Feature | OBO Flow | Token Validation | Proxy Pattern |
|---------|----------|------------------|---------------|
| Complexity | High | Low | Medium |
| Performance | Medium | High | Medium |
| Microsoft Graph Access | Yes | No | Yes |
| User Context | Maintained | Limited | Maintained |
| Implementation Effort | High | Low | Medium |
| Maintenance | High | Low | Medium |
| Security | High | Medium | Medium |
| Scalability | High | Medium | High |

## Choosing the Right Approach

### Choose OBO Flow when:
- You need to access multiple Microsoft services
- You need to maintain user context in backend operations
- You're building a complex enterprise application
- You need to perform long-running operations

### Choose Token Validation when:
- You only need basic user information
- Performance is critical
- You want to minimize complexity
- You don't need Microsoft Graph API access

### Choose Proxy Pattern when:
- You need occasional Microsoft Graph API access
- You want to hide API complexity from frontend
- You need to add custom logic to API calls
- You want to implement caching or rate limiting

## Best Practices

### Security
- Always validate tokens
- Use HTTPS for all communications
- Implement proper error handling
- Follow principle of least privilege
- Regular security audits

### Performance
- Implement caching where appropriate
- Use token validation for simple cases
- Consider using OBO flow for complex scenarios
- Monitor API usage and implement rate limiting

### Maintenance
- Keep dependencies updated
- Monitor token validation
- Implement proper logging
- Regular security reviews
- Document implementation details

## Example Implementations

### OBO Flow Example
```python
async def get_user_details_obo(user_token):
    try:
        # Exchange user token for Graph API token
        graph_token = await app.acquire_token_on_behalf_of(
            user_assertion=user_token,
            scopes=["https://graph.microsoft.com/User.Read"]
        )
        
        # Use Graph API token to get user details
        response = await graph_client.get_user_details(graph_token)
        return response
    except Exception as e:
        handle_error(e)
```

### Token Validation Example
```python
def get_user_details_from_token(token):
    try:
        # Validate and decode token
        decoded_token = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"]
        )
        
        # Extract user information
        return {
            "name": decoded_token.get("name"),
            "email": decoded_token.get("email"),
            "oid": decoded_token.get("oid")
        }
    except Exception as e:
        handle_error(e)
```

### Proxy Pattern Example
```python
async def get_user_details_proxy(user_token):
    try:
        # Forward request to Microsoft Graph
        response = await requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        # Add custom logic if needed
        return process_response(response)
    except Exception as e:
        handle_error(e)
```

## Conclusion

Each approach has its own strengths and use cases. The choice depends on your specific requirements:

- Use OBO Flow for complex enterprise applications
- Use Token Validation for simple, performance-critical applications
- Use Proxy Pattern for applications needing occasional Graph API access

Consider your requirements carefully and choose the approach that best fits your needs. 