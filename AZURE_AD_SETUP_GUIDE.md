# Azure AD Setup Guide for CalFix Outlook Integration

This guide walks you through setting up an Azure AD app registration for the CalFix Outlook calendar integration.

## Prerequisites

- Microsoft Azure account (free tier is sufficient)
- Access to Azure Active Directory
- Admin consent for your organization (if using work/school accounts)

## Step-by-Step Azure AD Configuration

### 1. Access Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Sign in with your Microsoft account
3. Go to **Azure Active Directory** from the main menu

### 2. Create App Registration

1. In the left sidebar, click **App registrations**
2. Click **+ New registration**
3. Fill in the registration form:
   - **Name**: `CalFix Calendar Dashboard`
   - **Supported account types**: Select **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**
   - **Redirect URI**:
     - Platform: **Single-page application (SPA)**
     - URI: `http://localhost:3001/oauth/callback`
4. Click **Register**

### 3. Save Your Application IDs

After registration, you'll see the app overview page. Save these values:

- **Application (client) ID**: This is your `VITE_OUTLOOK_CLIENT_ID`
- **Directory (tenant) ID**: Keep this for reference (we use "common" for multi-tenant)

### 4. Configure Authentication

1. In the left sidebar, click **Authentication**
2. Under **Platform configurations**, verify your SPA platform is configured
3. Add additional redirect URIs as needed:
   - Development: `http://localhost:3001/oauth/callback`
   - Production: `https://your-domain.vercel.app/oauth/callback`
4. Under **Implicit grant and hybrid flows**:
   - ✅ Check **Access tokens** (used for implicit grant)
   - ✅ Check **ID tokens** (used for authentication)
5. Under **Supported account types**, ensure it's set to multi-tenant
6. Click **Save**

### 5. Configure API Permissions

1. In the left sidebar, click **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add the following permissions:

   **Calendars:**
   - ✅ `Calendars.ReadWrite` - Read and write user calendars
   - ✅ `Calendars.ReadWrite.Shared` - Read and write user and shared calendars

   **User:**
   - ✅ `User.Read` - Sign in and read user profile (usually added by default)

   **Offline Access:**
   - ✅ `offline_access` - Maintain access to data you have given it access to

6. Click **Add permissions**

### 6. Grant Admin Consent (Optional)

If you're setting this up for an organization:

1. Click **Grant admin consent for [Your Organization]**
2. Confirm the consent dialog
3. You should see green checkmarks next to all permissions

**Note**: Personal accounts don't require admin consent.

### 7. Configure Client Secret (Optional)

For PKCE flow (recommended for SPAs), you don't need a client secret. However, if you want to use one:

1. In the left sidebar, click **Certificates & secrets**
2. Click **+ New client secret**
3. Add a description: `CalFix Client Secret`
4. Select expiration: **6 months** or **12 months**
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (it won't be shown again)
7. Save this as `VITE_OUTLOOK_CLIENT_SECRET` in your `.env` file

### 8. Configure Branding (Optional)

1. In the left sidebar, click **Branding & properties**
2. Add your application logo
3. Set your privacy policy URL
4. Set your terms of service URL
5. Click **Save**

## Environment Variables Configuration

After completing the Azure AD setup, update your `.env` file:

```bash
# Microsoft Outlook/Office 365 OAuth Configuration
VITE_OUTLOOK_CLIENT_ID=your-application-client-id-here
VITE_OUTLOOK_TENANT_ID=common
# Client secret is optional for PKCE flow
# VITE_OUTLOOK_CLIENT_SECRET=your-client-secret-here-if-using
```

## Testing the Integration

### Local Development Testing

1. Ensure your `.env` file has the correct values
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Navigate to the calendar dashboard
4. Click "Connect Outlook Calendar"
5. You should be redirected to Microsoft login
6. After authentication, you'll be redirected back to the app
7. Your Outlook calendar events should now be visible

### Troubleshooting Common Issues

#### Error: AADSTS50011 - Reply URL mismatch

**Problem**: The redirect URI doesn't match what's configured in Azure AD.

**Solution**:
- Ensure the redirect URI in your app exactly matches what's in Azure AD
- Check for trailing slashes, HTTP vs HTTPS, port numbers

#### Error: AADSTS65001 - Consent required

**Problem**: The user hasn't consented to the required permissions.

**Solution**:
- The consent dialog should appear automatically on first login
- If not, have the user visit: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&scope=...&prompt=consent`

#### Error: AADSTS700016 - Application not found

**Problem**: The client ID is incorrect or the app isn't properly registered.

**Solution**:
- Double-check your `VITE_OUTLOOK_CLIENT_ID`
- Ensure the app registration is complete and saved

#### Error: No refresh token received

**Problem**: The `offline_access` scope wasn't included.

**Solution**:
- Ensure `offline_access` is in your scope request
- Check that the permission is granted in Azure AD

## Production Deployment

### Update Azure AD for Production

1. Go back to your app registration in Azure Portal
2. Under **Authentication**, add your production redirect URI:
   - `https://your-domain.com/oauth/callback`
   - `https://your-app.vercel.app/oauth/callback`
3. Save the changes

### Update Vercel Environment Variables

1. In your Vercel dashboard, go to Settings → Environment Variables
2. Add:
   - `VITE_OUTLOOK_CLIENT_ID`
   - `VITE_OUTLOOK_TENANT_ID` (set to "common")
   - `VITE_REDIRECT_URI` (your production OAuth callback URL)

## Security Best Practices

1. **Use PKCE Flow**: Don't use client secrets in client-side applications
2. **Restrict Redirect URIs**: Only add the specific URIs you need
3. **Regular Secret Rotation**: If using secrets, rotate them regularly
4. **Monitor Usage**: Check Azure AD sign-in logs regularly
5. **Principle of Least Privilege**: Only request permissions you actually need

## API Quotas and Limits

Microsoft Graph API has the following limits:

- **Rate Limiting**: 10,000 requests per 10-minute window per app per tenant
- **Throttling**: Automatic retry with exponential backoff is recommended
- **Data Limits**:
  - Max 1000 events per request
  - Max 60-minute token lifetime (refresh tokens last longer)

## Additional Resources

- [Microsoft Graph Calendar API Documentation](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
- [Azure AD App Registration Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OAuth 2.0 Authorization Code Flow with PKCE](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Graph Permissions Reference](https://learn.microsoft.com/en-us/graph/permissions-reference)

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for detailed error messages
2. Review the Network tab to see API responses
3. Verify all permissions are granted in Azure AD
4. Ensure tokens are being stored and refreshed properly

---

**Last Updated**: November 2024
**CalFix Version**: 2.0.0
**Outlook Integration Version**: 1.0.0