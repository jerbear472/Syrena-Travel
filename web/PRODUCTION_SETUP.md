# Production Setup for Syrena Travel

## Update Supabase Redirect URLs

### 1. Get Your Vercel Production URL
Your app is deployed at: `https://your-app-name.vercel.app`
(Check your Vercel dashboard for the exact URL)

### 2. Update Supabase Authentication Settings

1. **Go to Supabase Dashboard:**
   - Visit https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs
   - Navigate to **Authentication** → **URL Configuration**

2. **Update Site URL:**
   - Change from: `http://localhost:3000` or `http://localhost:3003`
   - To: `https://your-app-name.vercel.app`

3. **Update Redirect URLs:**
   Add these URLs to the "Redirect URLs" field:
   ```
   https://your-app-name.vercel.app
   https://your-app-name.vercel.app/*
   https://your-app-name.vercel.app/auth/callback
   http://localhost:3000
   http://localhost:3003
   ```

   Keep localhost URLs for development, but add your production URLs.

4. **Update Email Templates (Optional):**
   - Go to **Authentication** → **Email Templates**
   - In the "Confirm signup" template, update the confirmation URL:

   Change from:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
   ```

   To ensure it uses your production URL:
   ```html
   <a href="https://your-app-name.vercel.app/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
   ```

### 3. Environment Variables in Vercel

Make sure your Vercel project has these environment variables set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### 4. Common Vercel Domains

Your app might be available at multiple URLs:
- `https://syrena-travel.vercel.app` (main domain)
- `https://syrena-travel-[username].vercel.app`
- `https://syrena-travel-git-main-[username].vercel.app`

Add all relevant URLs to Supabase's Redirect URLs.

## Testing Production Authentication

1. Visit your production app
2. Sign up with a new email
3. Check that the confirmation email links to your production URL
4. Confirm the email and verify you're redirected back to your app

## Troubleshooting

### If redirects still go to localhost:
1. Clear your browser cache
2. Check Supabase Dashboard → Authentication → Logs for any errors
3. Verify the Site URL is set correctly (not Redirect URLs, but the main Site URL field)

### If you get "Redirect URL not allowed" error:
1. Make sure you've added the exact URL including protocol (https://)
2. Add both with and without trailing slashes
3. Wait a few minutes for changes to propagate

## Multiple Environments Setup

For a proper multi-environment setup:

**Development:**
- Site URL: `http://localhost:3003`
- Use for local testing

**Production:**
- Site URL: `https://your-vercel-domain.vercel.app`
- Use for live users

You can keep both URLs in the Redirect URLs list to support both environments.