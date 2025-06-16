# 🔧 Fix Guide: File Content Reader & Page Content Reader Issues

## 🎯 **Your Current Issues**

### **Issue 1: File Content Reader Authentication Error**
- **Problem**: Using Document GUID (`B94A9F66-5639-4657-A8F2-BC1740E9F4C2`) instead of Graph API file ID
- **Your Input**: `file_id=B94A9F66-5639-4657-A8F2-BC1740E9F4C2`
- **Error**: "Authentication failed. Please ensure custom API scope is configured correctly."

### **Issue 2: Page Content Reader Wrong Parameter Type**
- **Problem**: Using filename (`Document for demo.docx`) as page_id - documents are not pages
- **Your Input**: `page_id=Document for demo.docx`
- **Error**: "Could not retrieve page content"

## ✅ **SOLUTION: Follow This Exact Workflow**

### **🔍 Step 1: Find Your Document Using Enhanced Search**

I've enhanced the File Content Reader with search capability. Here's what to do:

1. **Go to File Content Reader card**
2. **Clear the file_id field** (leave empty)
3. **Set these parameters**:
   ```
   file_id: (leave empty)
   site_id: mngenvmcap293807.sharepoint.com
   search_name: Document for demo.docx
   ```
4. **Click "Test API"**

**Expected Result**: You'll get a search results showing your document with the correct Graph API file ID.

### **🎯 Step 2: Get the Correct File ID**

From the search results, look for this structure:
```json
{
  "search_results": [
    {
      "id": "01ABCDEF123456789...",  // ← This is the CORRECT file_id to use
      "name": "Document for demo.docx",
      "size": 12345,
      "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "web_url": "https://mngenvmcap293807.sharepoint.com/...",
      "drive_name": "Documents"
    }
  ]
}
```

### **📄 Step 3: Read the File Content**

1. **Copy the correct file ID** from the search results
2. **Use these parameters in File Content Reader**:
   ```
   file_id: 01ABCDEF123456789...  (the ID you copied)
   site_id: mngenvmcap293807.sharepoint.com
   search_name: (leave empty or clear it)
   ```
3. **Click "Test API"**

**Expected Result**: You'll get the actual content of your Word document.

## 🌐 **For Page Content Reader (Clarification)**

**Important**: "Document for demo.docx" is a **document**, not a **page**. 

- **Page Content Reader** is for SharePoint **pages** (like Home.aspx, About.aspx)
- **File Content Reader** is for **documents** (like .docx, .pdf, .txt files)

### **If You Want to Read SharePoint Pages**:
1. **Click "Site Pages"** to see available pages
2. **Look for entries with .aspx extensions**
3. **Copy a page ID** from the Site Pages response
4. **Use that ID in Page Content Reader**

### **If You Want to Read Your Document** (Recommended):
- **Use File Content Reader** with the workflow above

## 🚀 **Alternative Quick Method**

If the search doesn't work, try this:

1. **Go to File Content Reader**
2. **Leave ALL parameters empty**
3. **Click "Test API"**
4. **Browse through the available files list**
5. **Find "Document for demo.docx"**
6. **Copy its ID and use it**

## 🔧 **Enhanced Features Added**

I've enhanced the system with:

1. **File Search**: Search by filename to find your documents
2. **Smart Site Resolution**: Handles domain-style site IDs
3. **Better Error Messages**: Clear guidance when things go wrong
4. **Discovery Mode**: Browse available files when no ID is provided

## 📋 **Quick Test Checklist**

### ✅ **Test 1: Search for Your Document**
- File Content Reader
- Parameters: `site_id=mngenvmcap293807.sharepoint.com`, `search_name=Document for demo.docx`
- Expected: List of matching files with correct IDs

### ✅ **Test 2: Read Document Content**
- File Content Reader  
- Parameters: Use the file_id from Test 1 results
- Expected: Actual document content

### ✅ **Test 3: Understand Page vs Document**
- Page Content Reader is for .aspx pages
- File Content Reader is for documents (.docx, .pdf, etc.)
- Your file is a document, so use File Content Reader

## 🎯 **Expected Working Example**

After following the steps, your File Content Reader should work with:
```
file_id: 01ABCDEF123456789...  (actual Graph API ID)
site_id: mngenvmcap293807.sharepoint.com
search_name: (empty)
```

And return the actual text content from your Word document!

---

**Status**: 🚀 Enhanced backend deployed with search capabilities
**Next**: Follow the workflow above to get the correct file ID and read your document content
