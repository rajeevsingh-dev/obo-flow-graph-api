from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import msal
import os
from dotenv import load_dotenv
import json
import jwt
import requests
from jwt.exceptions import InvalidTokenError
from msal import ConfidentialClientApplication

load_dotenv()

app = FastAPI(
    title="Microsoft Entra ID OBO Flow Demo",
    description="On-Behalf-Of (OBO) flow implementation for Microsoft Graph API access",
    version="5.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Azure AD configuration
TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
AUTHORITY = os.getenv("AUTHORITY")

# Server configuration
PORT = int(os.getenv("PORT", "5000"))
HOST = os.getenv("HOST", "localhost")

# Initialize MSAL application for OBO flow
msal_app = ConfidentialClientApplication(
    client_id=CLIENT_ID,
    client_credential=CLIENT_SECRET,
    authority=AUTHORITY
)

def validate_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate the incoming token for our custom API scope"""
    if not all([TENANT_ID, CLIENT_ID]):
        raise HTTPException(
            status_code=500,
            detail="Azure AD configuration is incomplete. Please check environment variables."
        )

    try:
        token = credentials.credentials
        print(f"Received token length: {len(token) if token else 'None'}")
        
        if not token or len(token) < 10:
            raise HTTPException(status_code=401, detail="Token is empty or too short")
        
        # Decode without verification for basic validation
        try:
            unverified_payload = jwt.decode(token, options={"verify_signature": False})
            
            # Validate audience - should be our custom API
            aud = unverified_payload.get('aud')
            expected_audience = f"api://{CLIENT_ID}"
            
            if aud != expected_audience:
                print(f"Token audience mismatch. Got: {aud}, Expected: {expected_audience}")
                raise HTTPException(
                    status_code=401, 
                    detail=f"Token must be for custom API scope: {expected_audience}"
                )
            
            print(f"✅ Token validation successful. Audience: {aud}")
            return unverified_payload
            
        except Exception as decode_error:
            print(f"Error decoding token: {decode_error}")
            raise HTTPException(status_code=401, detail=f"Invalid token format: {str(decode_error)}")
        
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")

async def get_bearer_token(authorization: str = Header(...)) -> str:
    """Extract and validate bearer token from authorization header"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    # Validate that the token is for our custom API
    try:
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        aud = unverified_payload.get('aud')
        expected_audience = f"api://{CLIENT_ID}"
        
        if aud != expected_audience:
            raise HTTPException(
                status_code=401, 
                detail=f"Token must be for custom API scope: {expected_audience}"
            )
        
        return token
        
    except jwt.InvalidTokenError as e:
        print(f"Token validation error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token format")
    except Exception as e:
        print(f"Unexpected token validation error: {str(e)}")
        raise HTTPException(status_code=401, detail="Token validation failed")

async def exchange_token_via_obo(user_token: str, scopes: list) -> str:
    """
    OBO Flow: Exchange user token for Microsoft Graph token
    """
    try:
        print(f"🔄 Starting OBO token exchange...")
        print(f"Requested scopes: {scopes}")
        
        result = msal_app.acquire_token_on_behalf_of(
            user_assertion=user_token,
            scopes=scopes
        )

        if "access_token" in result:
            print("✅ OBO token exchange successful")
            return result["access_token"]
        else:
            # Handle OBO flow errors
            error_code = result.get("error", "unknown_error")
            error_description = result.get("error_description", "No description available")
            correlation_id = result.get("correlation_id", "N/A")
            
            print(f"❌ OBO token exchange failed:")
            print(f"  Error Code: {error_code}")
            print(f"  Description: {error_description}")
            print(f"  Correlation ID: {correlation_id}")
            
            # Provide specific error messages based on error code
            if error_code == "invalid_grant":
                raise HTTPException(
                    status_code=401,
                    detail="Invalid user token. Please sign in again."
                )
            elif error_code == "insufficient_claims":
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions. Please grant additional consent."
                )
            elif error_code == "invalid_scope":
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid scope requested: {scopes}"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"OBO flow failed: {error_description}"
                )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error in OBO flow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Token exchange failed: {str(e)}"
        )

async def make_graph_request(endpoint: str, graph_token: str) -> dict:
    """Make a request to Microsoft Graph API with proper error handling"""
    try:
        headers = {
            "Authorization": f"Bearer {graph_token}",
            "Content-Type": "application/json"
        }
        
        print(f"🌐 Making Graph API request to: {endpoint}")
        response = requests.get(endpoint, headers=headers, timeout=30)
        
        if response.status_code == 200:
            print("✅ Graph API request successful")
            return response.json()
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Unauthorized: Token may be expired or invalid")
        elif response.status_code == 403:
            raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
        else:
            error_detail = f"Graph API call failed with status {response.status_code}"
            try:
                error_data = response.json()
                if "error" in error_data:
                    error_detail += f": {error_data['error'].get('message', 'Unknown error')}"
            except:
                error_detail += f": {response.text}"
            raise HTTPException(status_code=response.status_code, detail=error_detail)
            
    except requests.exceptions.RequestException as e:
        print(f"Request exception in make_graph_request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        print(f"Unexpected error in make_graph_request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "Microsoft Entra ID OBO Flow Demo",
        "version": "5.0.0",
        "authentication_method": "On-Behalf-Of (OBO) Flow",
        "description": "Server-side token exchange for Microsoft Graph API access",        "endpoints": {
            "/api/user": "Get authenticated user details from token claims",
            "/api/graph/user": "Get detailed user information from Microsoft Graph API (OBO)",
            "/api/sharepoint/sites": "Get SharePoint sites information (OBO)",
            "/api/sharepoint/libraries": "Get SharePoint document libraries and files (OBO)",
            "/api/sharepoint/lists": "Get SharePoint lists and their items (OBO)",
            "/api/sharepoint/pages": "Get SharePoint site pages (OBO)",
            "/api/sharepoint/navigation": "Get SharePoint site navigation structure (OBO)",
            "/api/sharepoint/recent": "Get recently accessed SharePoint files (OBO)"
        },
        "features": [
            "Microsoft Entra ID Authentication with Custom API Scope",
            "On-Behalf-Of (OBO) Flow Implementation",
            "Microsoft Graph API Access",
            "Server-side Token Management"
        ],
        "security": {
            "authentication": "Custom API scope (api://client-id/access_as_user)",
            "token_exchange": "OBO flow for Graph API access",
            "error_handling": "Comprehensive error responses"
        }
    }

@app.get("/api/user")
async def get_user_details(token_data: dict = Depends(validate_token)):
    """Get basic user details from token claims"""
    try:
        print("Complete token data:", json.dumps(token_data, indent=2))
        
        return {
            "message": "Successfully authenticated with custom API scope",
            "user_info": {
                "name": token_data.get("name", "Unknown"),
                "email": token_data.get("email", token_data.get("preferred_username", "Unknown")),
                "oid": token_data.get("oid", "Unknown"),
                "preferred_username": token_data.get("preferred_username", "Unknown"),
                "given_name": token_data.get("given_name", "Unknown"),
                "family_name": token_data.get("family_name", "Unknown"),
                "tenant_id": token_data.get("tid", "Unknown"),
                "scope": token_data.get("scp", "Unknown")
            },
            "authentication_method": "OBO Flow with Custom API Scope",
            "raw_token_claims": token_data
        }
    except Exception as e:
        print(f"Error in get_user_details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/graph/user")
async def get_graph_user_info(token: str = Depends(get_bearer_token)):
    """Get detailed user information from Microsoft Graph API using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, ["https://graph.microsoft.com/User.Read"])
        
        # Use the OBO token to call Graph API
        user_data = await make_graph_request("https://graph.microsoft.com/v1.0/me", graph_token)

        return {
            "message": "Successfully retrieved user information via OBO Flow",
            "user_data": user_data,
            "authentication_method": "OBO Flow",
            "scopes_used": ["User.Read"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_graph_user_info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/sharepoint/sites")
async def get_sharepoint_sites(token: str = Depends(get_bearer_token)):
    """Get SharePoint sites information using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, ["https://graph.microsoft.com/Sites.Read.All"])
        
        # Get root site and followed sites
        root_site = await make_graph_request("https://graph.microsoft.com/v1.0/sites/root", graph_token)
        
        try:
            followed_sites = await make_graph_request("https://graph.microsoft.com/v1.0/me/followedSites", graph_token)
        except:
            followed_sites = {"value": [], "note": "Could not retrieve followed sites"}

        return {
            "message": "Successfully retrieved SharePoint sites via OBO Flow",
            "root_site": root_site,
            "followed_sites": followed_sites,
            "authentication_method": "OBO Flow",
            "scopes_used": ["Sites.Read.All"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sharepoint_sites: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/sharepoint/libraries")
async def get_sharepoint_libraries(site_id: str = None, search_name: str = None, token: str = Depends(get_bearer_token)):
    """Get SharePoint document libraries and their files using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, ["https://graph.microsoft.com/Sites.Read.All"])
        
        # Use root site if no site_id provided, but try to find the specific site if it looks like a domain
        if not site_id:
            root_site = await make_graph_request("https://graph.microsoft.com/v1.0/sites/root", graph_token)
            site_id = root_site.get("id", "root")
        elif site_id and "sharepoint.com" in site_id and "," not in site_id:
            # If site_id looks like a domain, find the actual site ID
            try:
                sites = await make_graph_request("https://graph.microsoft.com/v1.0/sites?search=*", graph_token)
                for site in sites.get("value", []):
                    if site_id in site.get("webUrl", ""):
                        site_id = site.get("id")
                        break
            except:
                pass
        
        # Get document libraries (drives)
        libraries = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives", graph_token)
        
        # Get files from document libraries
        all_files = []
        search_results = []
        
        if libraries.get("value"):
            for drive in libraries["value"]:
                drive_id = drive.get("id")
                drive_name = drive.get("name", "Unknown")
                
                try:
                    if search_name:
                        # Search for specific file
                        search_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/root/search(q='{search_name}')"
                        search_files = await make_graph_request(search_url, graph_token)
                        
                        for file_item in search_files.get("value", []):
                            search_results.append({
                                "id": file_item.get("id"),
                                "name": file_item.get("name"),
                                "size": file_item.get("size", 0),
                                "content_type": file_item.get("file", {}).get("mimeType", "unknown"),
                                "web_url": file_item.get("webUrl", ""),
                                "drive_name": drive_name,
                                "last_modified": file_item.get("lastModifiedDateTime", ""),
                                "download_url": file_item.get("@microsoft.graph.downloadUrl", "")
                            })
                    else:
                        # Get all files from drive root
                        files = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/root/children", graph_token)
                        
                        for file_item in files.get("value", [])[:10]:  # Show first 10 files per drive
                            all_files.append({
                                "id": file_item.get("id"),
                                "name": file_item.get("name"),
                                "size": file_item.get("size", 0),
                                "content_type": file_item.get("file", {}).get("mimeType", "unknown"),
                                "drive_name": drive_name,
                                "last_modified": file_item.get("lastModifiedDateTime", ""),
                                "web_url": file_item.get("webUrl", "")
                            })
                except Exception as e:
                    print(f"Error processing drive {drive_name}: {str(e)}")
        
        if search_name and search_results:
            return {
                "message": f"Found {len(search_results)} file(s) matching '{search_name}' in document libraries",
                "instruction": "Copy a file 'id' from below. Note: File content reading requires Files.Read.All permission.",
                "search_results": search_results,
                "site_id": site_id,
                "search_term": search_name,
                "permission_note": "Files.Read.All consent required for content reading",
                "authentication_method": "OBO Flow",
                "scopes_used": ["Sites.Read.All"]
            }
        elif search_name:
            return {
                "message": f"No files found matching '{search_name}' in document libraries",
                "instruction": "Try a different search term or leave search_name empty to see all files",
                "site_id": site_id,
                "authentication_method": "OBO Flow"
            }
        else:
            return {
                "message": "Successfully retrieved SharePoint document libraries via OBO Flow",
                "site_id": site_id,
                "libraries": libraries.get("value", []),
                "all_files": all_files,
                "files_count": len(all_files),
                "instruction": "Copy file IDs to use with File Content Reader (requires Files.Read.All consent)",
                "permission_note": "Files.Read.All admin consent required for content reading functionality",
                "authentication_method": "OBO Flow",
                "scopes_used": ["Sites.Read.All"]
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sharepoint_libraries: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/sharepoint/lists")
async def get_sharepoint_lists(site_id: str = None, token: str = Depends(get_bearer_token)):
    """Get SharePoint lists and their items using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, ["https://graph.microsoft.com/Sites.Read.All"])
        
        # Use root site if no site_id provided
        if not site_id:
            root_site = await make_graph_request("https://graph.microsoft.com/v1.0/sites/root", graph_token)
            site_id = root_site.get("id", "root")
        
        # Get SharePoint lists
        lists = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists", graph_token)
        
        # Get items from the first few lists (excluding system lists)
        lists_with_items = []
        for sp_list in lists.get("value", [])[:3]:  # Limit to first 3 lists
            list_info = {
                "list": sp_list,
                "items": []
            }
            
            # Skip system lists
            if not sp_list.get("system", False):
                try:
                    list_id = sp_list.get("id")
                    items = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items?expand=fields&$top=5", graph_token)
                    list_info["items"] = items.get("value", [])
                except:
                    list_info["items"] = []
            
            lists_with_items.append(list_info)

        return {
            "message": "Successfully retrieved SharePoint lists via OBO Flow",
            "site_id": site_id,
            "lists_count": len(lists.get("value", [])),
            "lists_with_items": lists_with_items,
            "authentication_method": "OBO Flow",
            "scopes_used": ["Sites.Read.All"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sharepoint_lists: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/sharepoint/pages")
async def get_sharepoint_pages(site_id: str = None, token: str = Depends(get_bearer_token)):
    """Get SharePoint site pages using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, ["https://graph.microsoft.com/Sites.Read.All"])
        
        # Use root site if no site_id provided
        if not site_id:
            root_site = await make_graph_request("https://graph.microsoft.com/v1.0/sites/root", graph_token)
            site_id = root_site.get("id", "root")
        
        # Get site pages
        try:
            pages = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/pages", graph_token)
        except:
            # If pages endpoint doesn't work, try getting from Site Pages library
            try:
                pages_list = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/SitePages/items?expand=fields", graph_token)
                pages = {"value": pages_list.get("value", [])}
            except:
                pages = {"value": [], "note": "Could not retrieve site pages"}

        return {
            "message": "Successfully retrieved SharePoint site pages via OBO Flow",
            "site_id": site_id,
            "pages": pages.get("value", []),
            "pages_count": len(pages.get("value", [])),
            "authentication_method": "OBO Flow",
            "scopes_used": ["Sites.Read.All"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sharepoint_pages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/sharepoint/navigation")
async def get_sharepoint_navigation(site_id: str = None, token: str = Depends(get_bearer_token)):
    """Get SharePoint site navigation structure using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, ["https://graph.microsoft.com/Sites.Read.All"])
        
        # Use root site if no site_id provided
        if not site_id:
            root_site = await make_graph_request("https://graph.microsoft.com/v1.0/sites/root", graph_token)
            site_id = root_site.get("id", "root")
        
        # Get site information and subsites
        site_info = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}", graph_token)
        
        try:
            subsites = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/sites", graph_token)
        except:
            subsites = {"value": []}
        
        # Get web parts or navigation (this might need different permissions)
        navigation_info = {
            "site_info": {
                "name": site_info.get("displayName", "Unknown"),
                "description": site_info.get("description", ""),
                "webUrl": site_info.get("webUrl", ""),
                "createdDateTime": site_info.get("createdDateTime", ""),
                "lastModifiedDateTime": site_info.get("lastModifiedDateTime", "")
            },
            "subsites": subsites.get("value", []),
            "structure": {
                "lists_available": "Use /api/sharepoint/lists endpoint",
                "libraries_available": "Use /api/sharepoint/libraries endpoint",
                "pages_available": "Use /api/sharepoint/pages endpoint"
            }
        }

        return {
            "message": "Successfully retrieved SharePoint site navigation via OBO Flow",
            "site_id": site_id,
            "navigation": navigation_info,
            "subsites_count": len(subsites.get("value", [])),
            "authentication_method": "OBO Flow",
            "scopes_used": ["Sites.Read.All"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sharepoint_navigation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/sharepoint/recent")
async def get_sharepoint_recent_files(token: str = Depends(get_bearer_token)):
    """Get recently accessed SharePoint files using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, ["https://graph.microsoft.com/Sites.Read.All", "https://graph.microsoft.com/Files.Read.All"])
        
        # Get recent files from Microsoft Graph
        try:
            recent_files = await make_graph_request("https://graph.microsoft.com/v1.0/me/drive/recent", graph_token)
        except:
            # Alternative: Get files from user's OneDrive and SharePoint
            try:
                recent_files = await make_graph_request("https://graph.microsoft.com/v1.0/me/insights/used", graph_token)
            except:
                recent_files = {"value": [], "note": "Could not retrieve recent files"}
        
        # Filter SharePoint files (files with sharepoint.com in the URL)
        sharepoint_files = []
        for file_item in recent_files.get("value", []):
            web_url = ""
            if "webUrl" in file_item:
                web_url = file_item.get("webUrl", "")
            elif "resourceVisualization" in file_item:
                web_url = file_item.get("resourceVisualization", {}).get("containerWebUrl", "")
            
            if "sharepoint.com" in web_url.lower():
                sharepoint_files.append(file_item)

        return {
            "message": "Successfully retrieved recent SharePoint files via OBO Flow",
            "recent_files": recent_files.get("value", [])[:10],  # Show first 10
            "sharepoint_files": sharepoint_files[:5],  # Show first 5 SharePoint files
            "total_recent": len(recent_files.get("value", [])),
            "sharepoint_count": len(sharepoint_files),
            "authentication_method": "OBO Flow",
            "scopes_used": ["Sites.Read.All", "Files.Read.All"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sharepoint_recent_files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/debug/token")
async def debug_token_info(token: str = Depends(get_bearer_token)):
    """Debug endpoint to inspect token details"""
    try:
        # Decode token without verification to see what we're getting
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        
        return {
            "message": "Token debug information",
            "token_length": len(token),
            "token_preview": f"{token[:20]}...{token[-20:]}",
            "audience": unverified_payload.get("aud"),
            "issuer": unverified_payload.get("iss"),
            "scopes": unverified_payload.get("scp", "No scopes found"),
            "application_id": unverified_payload.get("appid"),
            "subject": unverified_payload.get("sub"),
            "upn": unverified_payload.get("upn"),
            "roles": unverified_payload.get("roles", []),
            "token_version": unverified_payload.get("ver"),
            "authentication_method": "OBO Flow with Custom API Scope"
        }
    except Exception as e:
        return {
            "error": f"Failed to decode token: {str(e)}",
            "token_length": len(token),
            "token_preview": f"{token[:20]}...{token[-20:]}"
        }

@app.get("/api/sharepoint/file-content")
async def get_sharepoint_file_content(file_id: str = None, site_id: str = None, search_name: str = None, token: str = Depends(get_bearer_token)):
    """Get actual content from SharePoint files using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, [
            "https://graph.microsoft.com/Sites.Read.All", 
            "https://graph.microsoft.com/Files.Read.All"
        ])
        
        # Use root site if no site_id provided, but try to find the specific site if it looks like a domain
        if not site_id:
            root_site = await make_graph_request("https://graph.microsoft.com/v1.0/sites/root", graph_token)
            site_id = root_site.get("id", "root")
        elif site_id and "sharepoint.com" in site_id and "," not in site_id:
            # If site_id looks like a domain (e.g., mngenvmcap293807.sharepoint.com), find the actual site ID
            try:
                sites = await make_graph_request("https://graph.microsoft.com/v1.0/sites?search=*", graph_token)
                for site in sites.get("value", []):
                    if site_id in site.get("webUrl", ""):
                        site_id = site.get("id")
                        break
            except:
                pass  # Fall back to using the provided site_id
        
        # If no file_id provided, get available files or search by name
        if not file_id:
            try:
                libraries = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives", graph_token)
                available_files = []
                search_results = []
                
                if libraries.get("value"):
                    for drive in libraries["value"]:
                        drive_id = drive.get("id")
                        drive_name = drive.get("name", "Unknown")
                        
                        # If searching by name, use search endpoint
                        if search_name:
                            try:
                                search_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/root/search(q='{search_name}')"
                                search_files = await make_graph_request(search_url, graph_token)
                                
                                for file_item in search_files.get("value", []):
                                    search_results.append({
                                        "id": file_item.get("id"),
                                        "name": file_item.get("name"),
                                        "size": file_item.get("size", 0),
                                        "content_type": file_item.get("file", {}).get("mimeType", "unknown"),
                                        "web_url": file_item.get("webUrl", ""),
                                        "drive_name": drive_name,
                                        "last_modified": file_item.get("lastModifiedDateTime", "")
                                    })
                            except Exception as e:
                                print(f"Search error in drive {drive_name}: {str(e)}")
                        else:
                            # Get files from root of drive
                            try:
                                files = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/root/children", graph_token)
                                
                                for file_item in files.get("value", [])[:5]:  # Show first 5 files per drive
                                    available_files.append({
                                        "id": file_item.get("id"),
                                        "name": file_item.get("name"),
                                        "size": file_item.get("size", 0),
                                        "content_type": file_item.get("file", {}).get("mimeType", "unknown"),
                                        "drive_name": drive_name
                                    })
                            except Exception as e:
                                print(f"Error listing files in drive {drive_name}: {str(e)}")
                
                if search_name and search_results:
                    return {
                        "message": f"Found {len(search_results)} file(s) matching '{search_name}':",
                        "instruction": "Copy a file 'id' from below and use: /api/sharepoint/file-content?file_id=<copied_id>",
                        "search_results": search_results,
                        "site_id": site_id,
                        "search_term": search_name,
                        "authentication_method": "OBO Flow",
                        "scopes_used": ["Sites.Read.All", "Files.Read.All"]
                    }
                elif search_name:
                    return {
                        "message": f"No files found matching '{search_name}'",
                        "instruction": "Try a different search term or leave search_name empty to see all files",
                        "site_id": site_id,
                        "authentication_method": "OBO Flow"
                    }
                elif available_files:
                    return {
                        "message": "No file_id provided. Here are available files to read content from:",
                        "instruction": "Copy a file 'id' from below and use: /api/sharepoint/file-content?file_id=<copied_id>",
                        "available_files": available_files,
                        "site_id": site_id,
                        "tip": "Add &search_name=filename to search for specific files",
                        "authentication_method": "OBO Flow",
                        "scopes_used": ["Sites.Read.All", "Files.Read.All"]
                    }
                else:
                    return {
                        "message": "No file_id provided and no files found",
                        "instruction": "Use: /api/sharepoint/file-content?file_id=<file_id>&site_id=<site_id>",
                        "site_id": site_id,
                        "authentication_method": "OBO Flow"
                    }
            except Exception as e:
                return {
                    "message": "No file_id provided. Could not retrieve available files.",
                    "instruction": "Use: /api/sharepoint/file-content?file_id=<file_id>&site_id=<site_id>",
                    "error": str(e),
                    "authentication_method": "OBO Flow"
                }
        
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, [
            "https://graph.microsoft.com/Sites.Read.All", 
            "https://graph.microsoft.com/Files.Read.All"
        ])
        
        # Use root site if no site_id provided
        if not site_id:
            root_site = await make_graph_request("https://graph.microsoft.com/v1.0/sites/root", graph_token)
            site_id = root_site.get("id", "root")
        
        # Get file metadata first
        file_metadata = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/items/{file_id}", graph_token)
        
        file_content_result = {
            "file_metadata": file_metadata,
            "content": None,
            "content_type": "unknown",
            "size_mb": round(file_metadata.get("size", 0) / (1024 * 1024), 2),
            "can_extract_text": False
        }
        
        file_name = file_metadata.get("name", "").lower()
        file_size = file_metadata.get("size", 0)
        
        # Check if file is too large (limit to 10MB for demo)
        if file_size > 10 * 1024 * 1024:
            file_content_result["content"] = "File too large for content extraction (>10MB)"
            file_content_result["content_type"] = "size_limit_exceeded"
            return {
                "message": "File metadata retrieved, but content too large to extract",
                "file_content": file_content_result,
                "authentication_method": "OBO Flow",
                "scopes_used": ["Sites.Read.All", "Files.Read.All"]
            }
        
        try:
            # Get download URL and download file content
            download_url = file_metadata.get("@microsoft.graph.downloadUrl")
            if not download_url:
                # Alternative method to get content
                content_response = requests.get(
                    f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/items/{file_id}/content",
                    headers={"Authorization": f"Bearer {graph_token}"},
                    timeout=30
                )
            else:
                # Download using the direct URL
                content_response = requests.get(download_url, timeout=30)
            
            if content_response.status_code == 200:
                file_content_result["can_extract_text"] = True
                
                # Text files
                if any(ext in file_name for ext in ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm']):
                    try:
                        file_content_result["content"] = content_response.text[:5000]  # Limit to first 5000 chars
                        file_content_result["content_type"] = "text"
                    except:
                        file_content_result["content"] = "Could not decode text content"
                        file_content_result["content_type"] = "text_decode_error"
                
                # Office documents (basic text extraction)
                elif any(ext in file_name for ext in ['.docx', '.xlsx', '.pptx']):
                    try:
                        import zipfile
                        import io
                        from xml.etree import ElementTree as ET
                        
                        # Office files are ZIP archives
                        zip_file = zipfile.ZipFile(io.BytesIO(content_response.content))
                        
                        if '.docx' in file_name:
                            # Extract text from Word document
                            doc_xml = zip_file.read('word/document.xml')
                            tree = ET.fromstring(doc_xml)
                            
                            # Extract text nodes
                            text_content = []
                            for elem in tree.iter():
                                if elem.text:
                                    text_content.append(elem.text)
                            
                            file_content_result["content"] = ' '.join(text_content)[:3000]
                            file_content_result["content_type"] = "word_document"
                            
                        elif '.xlsx' in file_name:
                            # Extract text from Excel workbook
                            try:
                                shared_strings = zip_file.read('xl/sharedStrings.xml')
                                tree = ET.fromstring(shared_strings)
                                
                                strings = []
                                for si in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                                    for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                                        if t.text:
                                            strings.append(t.text)
                                
                                file_content_result["content"] = ' | '.join(strings[:100])  # First 100 strings
                                file_content_result["content_type"] = "excel_workbook"
                            except:
                                file_content_result["content"] = "Excel file detected but could not extract text content"
                                file_content_result["content_type"] = "excel_extraction_error"
                        
                        elif '.pptx' in file_name:
                            # Extract text from PowerPoint
                            slides_text = []
                            slide_files = [f for f in zip_file.namelist() if f.startswith('ppt/slides/slide')]
                            
                            for slide_file in slide_files[:10]:  # First 10 slides
                                try:
                                    slide_xml = zip_file.read(slide_file)
                                    tree = ET.fromstring(slide_xml)
                                    
                                    slide_text = []
                                    for elem in tree.iter():
                                        if elem.text and elem.text.strip():
                                            slide_text.append(elem.text.strip())
                                    
                                    if slide_text:
                                        slides_text.append(' '.join(slide_text))
                                except:
                                    continue
                            
                            file_content_result["content"] = '\n\n--- SLIDE ---\n\n'.join(slides_text)[:3000]
                            file_content_result["content_type"] = "powerpoint_presentation"
                        
                    except Exception as office_error:
                        file_content_result["content"] = f"Office document detected but extraction failed: {str(office_error)}"
                        file_content_result["content_type"] = "office_extraction_error"
                
                # PDF files (basic info)
                elif '.pdf' in file_name:
                    file_content_result["content"] = "PDF file detected. Content extraction requires additional libraries."
                    file_content_result["content_type"] = "pdf"
                    file_content_result["can_extract_text"] = False
                
                # Image files
                elif any(ext in file_name for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']):
                    file_content_result["content"] = f"Image file: {file_name} ({file_content_result['size_mb']} MB)"
                    file_content_result["content_type"] = "image"
                    file_content_result["can_extract_text"] = False
                
                # Binary files
                else:
                    file_content_result["content"] = f"Binary file: {file_name} (Content type not supported for text extraction)"
                    file_content_result["content_type"] = "binary"
                    file_content_result["can_extract_text"] = False
            
            else:
                file_content_result["content"] = f"Could not download file content (HTTP {content_response.status_code})"
                file_content_result["content_type"] = "download_error"
        
        except Exception as content_error:
            file_content_result["content"] = f"Error reading file content: {str(content_error)}"
            file_content_result["content_type"] = "content_error"

        return {
            "message": "Successfully retrieved SharePoint file content via OBO Flow",
            "site_id": site_id,
            "file_id": file_id,
            "file_content": file_content_result,
            "authentication_method": "OBO Flow",
            "scopes_used": ["Sites.Read.All", "Files.Read.All"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sharepoint_file_content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/sharepoint/page-content")
async def get_sharepoint_page_content(page_id: str = None, site_id: str = None, token: str = Depends(get_bearer_token)):
    """Get actual HTML content from SharePoint pages using OBO Flow"""
    try:
        # Exchange user token for Graph API token using OBO flow
        graph_token = await exchange_token_via_obo(token, ["https://graph.microsoft.com/Sites.Read.All"])
        
        # Use root site if no site_id provided
        if not site_id:
            root_site = await make_graph_request("https://graph.microsoft.com/v1.0/sites/root", graph_token)
            site_id = root_site.get("id", "root")
        
        # If no page_id provided, get available pages to choose from
        if not page_id:
            try:
                # Get Site Pages library
                pages_list = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/SitePages/items?expand=fields&$top=10", graph_token)
                
                available_pages = []
                for page_item in pages_list.get("value", []):
                    fields = page_item.get("fields", {})
                    available_pages.append({
                        "id": page_item.get("id"),
                        "title": fields.get("Title", "Untitled"),
                        "file_name": fields.get("FileLeafRef", "unknown.aspx"),
                        "created": fields.get("Created", ""),
                        "modified": fields.get("Modified", "")
                    })
                
                return {
                    "message": "No page_id provided. Here are available SharePoint pages:",
                    "instruction": "Copy a page 'id' from below and use: /api/sharepoint/page-content?page_id=<copied_id>",
                    "available_pages": available_pages,
                    "site_id": site_id,
                    "authentication_method": "OBO Flow",
                    "scopes_used": ["Sites.Read.All"]
                }
            except Exception as e:
                return {
                    "message": "No page_id provided. Could not retrieve available pages.",
                    "instruction": "Use: /api/sharepoint/page-content?page_id=<page_id>&site_id=<site_id>",
                    "error": str(e),
                    "authentication_method": "OBO Flow",
                    "help": "Try using the 'Site Pages' endpoint first to get available page IDs"
                }
        
        try:
            # Try to get page content using the Graph API
            page_content = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/pages/{page_id}/webParts", graph_token)
        except:
            # Alternative: Get from Site Pages library
            try:
                page_item = await make_graph_request(f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/SitePages/items/{page_id}?expand=fields", graph_token)
                
                # Extract content from fields
                fields = page_item.get("fields", {})
                page_content = {
                    "title": fields.get("Title", "Unknown"),
                    "content": fields.get("CanvasContent1", "No content available"),
                    "description": fields.get("Description", ""),
                    "created": fields.get("Created", ""),
                    "modified": fields.get("Modified", ""),
                    "author": fields.get("Author", {})
                }
            except:
                page_content = {"error": "Could not retrieve page content"}

        return {
            "message": "Successfully retrieved SharePoint page content via OBO Flow",
            "site_id": site_id,
            "page_id": page_id,
            "page_content": page_content,
            "authentication_method": "OBO Flow",
            "scopes_used": ["Sites.Read.All"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sharepoint_page_content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting OBO Flow Demo Server...")
    print("🔐 Authentication: Custom API Scope with OBO Token Exchange")
    print("📍 Server URL: http://localhost:5000")
    print("📋 API Documentation: http://localhost:5000/docs")
    uvicorn.run(app, host=HOST, port=PORT)
