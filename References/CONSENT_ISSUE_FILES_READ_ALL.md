# Admin Consent Required for Files.Read.All

## 🚨 **Current Issue**

The application needs **admin consent** for the `Files.Read.All` permission. Even though you granted permissions, the error suggests it may not have been properly consented for the OBO (On-Behalf-Of) flow.

## ✅ **Working Endpoints** (Sites.Read.All only)
- ✅ User Token Claims
- ✅ SharePoint Sites  
- ✅ Document Libraries (partial - shows file list but can't read content)
- ✅ SharePoint Lists
- ✅ Site Pages
- ✅ Site Navigation

## ❌ **Failing Endpoints** (requires Files.Read.All)
- ❌ File Content Reader
- ❌ Recent Files

## 🛠️ **Immediate Solutions**

### **Option 1: Use Document Libraries to Get File ID**
1. **Click "Document Libraries"** endpoint
2. **Look for "Document for demo.docx"** in the file list
3. **Copy the file `id`** (Graph API file ID)
4. **Write down this ID** for future use

### **Option 2: Proper Admin Consent Flow**

You need to complete the admin consent specifically for **Files.Read.All**:

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate**: Azure Active Directory → App registrations
3. **Find**: "PeopleAgentConsole" (20e9f47b-7a60-4279-94d6-6a9684a16920)
4. **Go to**: API permissions
5. **Verify these permissions exist**:
   - Microsoft Graph → Sites.Read.All ✅ (working)
   - Microsoft Graph → Files.Read.All ❌ (needs consent)
   - Microsoft Graph → Files.ReadWrite.All (optional)
6. **Click**: "Grant admin consent for [your tenant]" 
7. **Wait 5-10 minutes** for consent to propagate

### **Option 3: Interactive Consent (Alternative)**

If admin consent doesn't work, you can trigger user consent:

1. **Go to**: https://login.microsoftonline.com/79e00fbc-5c95-4dc3-9b30-2a75bb9ad7cc/oauth2/v2.0/authorize?client_id=20e9f47b-7a60-4279-94d6-6a9684a16920&response_type=code&scope=https://graph.microsoft.com/Files.Read.All&redirect_uri=http://localhost:3000
2. **Sign in** and **grant consent**
3. **Then test the File Content Reader** again

## 🔍 **Current Status from Logs**

```
✅ Sites.Read.All - Working perfectly
❌ Files.Read.All - AADSTS65001 consent error
🆔 Your Site ID: mngenvmcap293807.sharepoint.com,7148cf944-72e2-407e-af52-dfef1c0c1b09,244057d7-4066-44a9-95a8-b4221d681197
```

## 🎯 **Next Steps**

1. **Try Document Libraries** endpoint to get the file ID
2. **Grant admin consent** for Files.Read.All
3. **Wait 5-10 minutes** for propagation
4. **Test File Content Reader** again

**Note**: Some organizations require IT admin approval for Files.Read.All since it can access all SharePoint files.
