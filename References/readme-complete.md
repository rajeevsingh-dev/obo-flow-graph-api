# Microsoft Entra ID Delegates Demo

A comprehensive demonstration of implementing the **Delegates Pattern** for Microsoft Entra ID authentication using MSAL (Microsoft Authentication Library) with a Next.js frontend and Python FastAPI backend.

## 📋 Overview

This project showcases a modern authentication architecture that implements delegated access patterns for secure user authentication and API access. The application demonstrates how to properly handle Microsoft Entra ID tokens, validate user sessions, and maintain secure communication between frontend and backend services.

### Key Features

- **Delegated Authentication**: Implements the delegates pattern for secure token-based authentication
- **Modern Tech Stack**: Next.js with React and Python FastAPI
- **Secure Token Handling**: Proper JWT validation and user session management
- **Real-time User Details**: Fetch and display authenticated user information
- **Error Handling**: Comprehensive error handling and debugging capabilities
- **Production-Ready**: Follows Microsoft authentication best practices

## 🚀 Quick Start

**TL;DR - Get it running in 5 minutes:**

1. **Prerequisites**: Install Node.js (v18+) and Python (v3.8+)
2. **Azure Setup**: [Create Azure App Registration](#-azure-app-registration-setup) (5 steps)
3. **Environment**: Copy your Azure credentials to `.env` files
4. **Run Backend**: `cd backend && pip install -r requirements.txt && python main.py`
5. **Run Frontend**: `cd frontend && npm install && npm run dev`
6. **Test**: Open http://localhost:3000 and sign in

For detailed setup instructions, continue reading below.

## 🎯 Delegates Pattern & Application Access

### What is Delegated Access?

Delegated access is a security pattern where an application requests permissions **on behalf of a signed-in user**. This pattern ensures that:

- The application can only access resources that the user has permission to access
- User consent is required for the application to access their data
- The application acts as a delegate of the user, not with its own identity

### Types of Access Patterns

| Pattern | Description | Use Case | Implementation |
|---------|-------------|----------|----------------|
| **Delegated Access** | App acts on behalf of user | User-interactive applications | MSAL with user login |
| **Application Access** | App acts with its own identity | Background services, daemons | Client credentials flow |
| **Hybrid Access** | Combination of both patterns | Complex enterprise applications | Multiple auth flows |

### Why We Choose Delegated Access

1. **User-Centric Security**: Every API call is made with user context
2. **Principle of Least Privilege**: Users only access what they're authorized for
3. **Audit Trail**: All actions are tied to specific user identities
4. **Compliance**: Meets enterprise security and compliance requirements
5. **Microsoft Graph Integration**: Seamless access to user's Microsoft 365 data

### Implementation Approaches

#### 1. **On-Behalf-Of (OBO) Flow** 
```python
# Backend receives user token and exchanges for Graph API token
app.acquire_token_on_behalf_of(
    user_assertion=user_token,
    scopes=["https://graph.microsoft.com/User.Read"]
)
```

#### 2. **Token Validation + Direct API** (Our Implementation)
```python
# Validate user token and use it directly
decoded_token = jwt.decode(token, public_key, algorithms=["RS256"])
# Use token claims for user information
```

#### 3. **Proxy Pattern**
```python
# Backend acts as a proxy to Microsoft Graph
requests.get("https://graph.microsoft.com/v1.0/me", 
           headers={"Authorization": f"Bearer {user_token}"})
```

### Our Implementation Choice

We selected **Token Validation + Direct API** approach because:

- ✅ **Simplicity**: Direct token validation without additional OAuth flows
- ✅ **Performance**: No additional token exchanges required
- ✅ **Transparency**: Clear visibility into token contents and user claims
- ✅ **Security**: Proper JWT validation with Microsoft's public keys
- ✅ **Debugging**: Easy to inspect and troubleshoot token issues

## 🛠️ Project Structure

```
Delegates-Demo/
├── 📁 frontend/                    # Next.js React Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Main authentication demo page
│   │   │   ├── layout.tsx         # App layout with MSAL provider
│   │   │   └── globals.css        # Global styles
│   │   ├── components/
│   │   │   └── MsalWrapper.tsx    # MSAL configuration wrapper
│   │   └── config/
│   │       └── authConfig.ts      # MSAL configuration
│   ├── package.json               # Dependencies and scripts
│   ├── package-lock.json          # Locked dependency versions
│   ├── next.config.js             # Next.js configuration
│   ├── tailwind.config.js         # Tailwind CSS configuration
│   ├── postcss.config.js          # PostCSS configuration
│   ├── tsconfig.json              # TypeScript configuration
│   ├── next-env.d.ts              # Next.js TypeScript declarations
│   ├── .next/                     # Build output (auto-generated)
│   ├── node_modules/              # Dependencies (auto-generated)
│   └── .env.local                 # Frontend environment variables
├── 📁 backend/                     # Python FastAPI Application
│   ├── main.py                    # FastAPI server with auth endpoints
│   ├── requirements.txt           # Python dependencies
│   ├── test_api.py               # API testing script
│   ├── venv/                      # Python virtual environment
│   └── .env                      # Backend environment variables
├── README.md                      # This comprehensive guide
├── UserFlow.md                   # Authentication flow diagrams
└── .gitignore                    # Git ignore file (excludes .env files)
```

## 📋 Prerequisites & System Requirements

### Software Prerequisites

| Software | Version | Download Link | Notes |
|----------|---------|---------------|-------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) | Required for Next.js frontend |
| **Python** | v3.8+ | [python.org](https://python.org/) | Required for FastAPI backend |
| **npm** | v8+ | Included with Node.js | Package manager for frontend |
| **pip** | Latest | Included with Python | Package manager for backend |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | Version control |

### Azure Prerequisites

- ✅ **Azure subscription** with active tenant
- ✅ **Microsoft Entra ID** (Azure AD) access
- ✅ **Application Administrator** or **Global Administrator** role
- ✅ Permission to grant admin consent for API permissions

## 🔧 Azure App Registration Setup

### Step 1: Create New App Registration

1. **Navigate to Azure Portal**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Sign in with administrative credentials

2. **Access App Registrations**
   ```
   Azure Portal → Microsoft Entra ID → App registrations → + New registration
   ```

3. **Configure Basic Information**
   ```
   Name: Delegates Demo
   Supported account types: Accounts in this organizational directory only
   Redirect URI: Single-page application (SPA)
   URL: http://localhost:3000
   ```

4. **Complete Registration**
   - Click **Register**
   - 📝 **Important**: Save the **Application (client) ID** and **Directory (tenant) ID**

### Step 2: Configure Authentication Settings

1. **Navigate to Authentication**
   ```
   Your App → Authentication → Platform configurations
   ```

2. **Configure SPA Settings**
   - Platform: **Single-page application**
   - Redirect URIs:
     ```
     http://localhost:3000
     http://localhost:3000/
     ```

3. **Enable Token Types**
   Under **Implicit grant and hybrid flows**:
   - ✅ **Access tokens** (used for implicit flows)
   - ✅ **ID tokens** (used for implicit and hybrid flows)

4. **Advanced Settings**
   ```
   Allow public client flows: No
   Live SDK support: No
   ```

5. **Save Configuration**

### Step 3: Configure API Permissions

1. **Navigate to API Permissions**
   ```
   Your App → API permissions → + Add a permission
   ```

2. **Select Microsoft Graph**
   - Choose **Microsoft Graph**
   - Select **Delegated permissions**

3. **Add Required Permissions**
   | Permission | Type | Description |
   |------------|------|-------------|
   | `User.Read` | Delegated | Sign in and read user profile |
   | `profile` | Delegated | View users' basic profile |
   | `email` | Delegated | View users' email address |
   | `openid` | Delegated | Sign users in |

4. **Grant Admin Consent**
   - Click **Grant admin consent for [Your Organization]**
   - Confirm the action
   - ✅ Ensure all permissions show **Granted** status

### Step 4: Create Client Secret

1. **Navigate to Certificates & Secrets**
   ```
   Your App → Certificates & secrets → + New client secret
   ```

2. **Configure Secret**
   ```
   Description: Delegates Demo Backend Secret
   Expires: 24 months (recommended)
   ```

3. **Save Secret Value**
   - Click **Add**
   - 🚨 **Critical**: Copy the **Value** immediately
   - This value will never be shown again!

### Step 5: Gather Configuration Values

From your app registration **Overview** page, collect:

| Field | Example Value | Usage |
|-------|---------------|-------|
| **Application (client) ID** | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Frontend & Backend |
| **Directory (tenant) ID** | `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy` | Frontend & Backend |
| **Client secret** | `your_generated_client_secret_value` | Backend only |

## 🚀 Project Setup & Installation

### 📁 Environment Configuration

#### Frontend Environment Variables

Create `.env.local` in the `frontend` directory:

```env
# Azure AD Configuration
NEXT_PUBLIC_AZURE_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_AZURE_TENANT_ID=your_tenant_id_here
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> **💡 Note**: If you cloned this repository, there may already be demo credentials in the `.env.local` file. Replace them with your own Azure app registration values.

**🔒 Security Notes:**
- ✅ `NEXT_PUBLIC_*` variables are safe for frontend (client-side)
- ✅ Client ID and Tenant ID are not sensitive information
- ❌ Never put client secrets in frontend environment files

#### Backend Environment Variables

Create `.env` in the `backend` directory:

```env
# Microsoft Graph API Settings
AZURE_CLIENT_ID=your_client_id_here
AZURE_TENANT_ID=your_tenant_id_here
AUTHORITY=https://login.microsoftonline.com/your_tenant_id_here
AZURE_CLIENT_SECRET=your_client_secret_here
SCOPE=https://graph.microsoft.com/.default
ENDPOINT=https://graph.microsoft.com/v1.0/users

# Server Configuration
PORT=5000
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:3000
```

> **💡 Note**: If you cloned this repository, there may already be demo credentials in the `.env` file. Replace them with your own Azure app registration values.

**🔒 Security Notes:**
- 🚨 **Client secret is highly sensitive** - never commit to source control
- ✅ Add `.env` files to `.gitignore` (see example below)
- ✅ Use different secrets for different environments

### Frontend Setup

1. **Navigate to frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Start development server**:
   ```powershell
   npm run dev
   ```
   ✅ Frontend will be available at: http://localhost:3000

### Backend Setup

1. **Navigate to backend directory**:
   ```powershell
   cd backend
   ```

2. **Create virtual environment**:
   ```powershell
   python -m venv venv
   ```

3. **Activate virtual environment**:
   ```powershell
   # Windows PowerShell
   .\venv\Scripts\Activate.ps1
   
   # Windows Command Prompt
   .\venv\Scripts\activate.bat
   
   # macOS/Linux
   source venv/bin/activate
   ```

4. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

5. **Start backend server**:
   ```powershell
   python main.py
   ```
   ✅ Backend API will be available at: http://localhost:5000

## 🎮 Usage Guide

### 1. Start Both Services
```powershell
# Terminal 1: Start Backend
cd backend
python main.py

# Terminal 2: Start Frontend  
cd frontend
npm run dev
```

### 2. Open Application
Navigate to http://localhost:3000 in your browser

### 3. Sign In Process
1. Click **"Sign In with Microsoft"**
2. Complete authentication in popup window
3. View your user details and debug information

### 4. API Testing
Test the backend API directly:
```powershell
cd backend
python test_api.py
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ❌ Liability
- ❌ Warranty

---

**📧 Support**: For questions about this demo, please open an issue on GitHub.

**🔄 Last Updated**: June 9, 2025 - Updated for latest MSAL.js and Microsoft Entra ID features. 