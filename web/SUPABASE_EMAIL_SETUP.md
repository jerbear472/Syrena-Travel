# Supabase Email Confirmation Setup Guide

## 🔧 Setting Up Email Confirmations in Supabase

Email confirmations are **REQUIRED** for production apps. Here's how to enable them in your Supabase project:

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **fisghxjiurwrafgfzcxs**

### Step 2: Configure Authentication Settings

1. Navigate to **Authentication** → **Providers** in the left sidebar
2. Click on **Email** provider
3. Ensure these settings are configured:
   - ✅ **Enable Email Signup** = ON
   - ✅ **Confirm email** = ON (REQUIRED for email verification)
   - ✅ **Secure email change** = ON
   - ✅ **Secure password change** = ON

### Step 3: Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize these templates:

#### Confirmation Email Template
```html
<h2>Welcome to Syrena Travel!</h2>
<p>Thanks for signing up. Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>This link will expire in 24 hours.</p>
```

#### Magic Link Template
```html
<h2>Your Syrena Travel Login Link</h2>
<p>Click the link below to log in to your account:</p>
<p><a href="{{ .ConfirmationURL }}">Log in to Syrena</a></p>
<p>This link will expire in 24 hours.</p>
```

### Step 4: SMTP Configuration (IMPORTANT!)

By default, Supabase uses their built-in email service which has **limitations**:
- Rate limited to 3 emails per hour
- Only works for testing

#### For Production: Configure Custom SMTP

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP** and configure:

##### Option A: Use Gmail (Quick Setup)
```
SMTP Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: Your App Password (not regular password!)
Sender Email: your-email@gmail.com
Sender Name: Syrena Travel
```

**To get Gmail App Password:**
1. Go to Google Account settings
2. Security → 2-Step Verification (must be enabled)
3. App passwords → Generate new password
4. Use this password in SMTP settings

##### Option B: Use SendGrid (Recommended for Production)
```
SMTP Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: Your SendGrid API Key
Sender Email: noreply@yourdomain.com
Sender Name: Syrena Travel
```

##### Option C: Use Resend (Modern Alternative)
```
SMTP Host: smtp.resend.com
Port: 587
Username: resend
Password: Your Resend API Key
Sender Email: onboarding@resend.dev (or your domain)
Sender Name: Syrena Travel
```

### Step 5: Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add your site URL to **Redirect URLs**:
   ```
   http://localhost:3003/*
   https://yourdomain.com/*
   ```

### Step 6: Test Email Confirmation

1. Sign up with a new email address
2. Check your inbox for confirmation email
3. Click the confirmation link
4. You should be redirected back to your app

## 🚨 Troubleshooting

### Not Receiving Emails?

1. **Check Spam Folder** - Confirmation emails often end up in spam
2. **Rate Limits** - Default Supabase emails limited to 3/hour
3. **SMTP Not Configured** - Set up custom SMTP for reliable delivery

### Email Confirmed but Can't Login?

1. Check the `auth.users` table in Supabase
2. Verify `email_confirmed_at` is not null
3. Check `confirmation_token` has been cleared

### Testing in Development

For local testing, you can temporarily disable email confirmation:
1. Go to **Authentication** → **Providers** → **Email**
2. Set **Confirm email** = OFF (ONLY for testing!)
3. Remember to turn it back ON for production!

## 📧 Current Status

Your Supabase project (`fisghxjiurwrafgfzcxs`) is configured and ready, but you need to:

1. ✅ Supabase project exists and is connected
2. ⚠️ Check if email confirmations are enabled in dashboard
3. ⚠️ Configure SMTP for production email delivery
4. ⚠️ Customize email templates with your branding

## 🔗 Quick Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs)
- [Auth Settings](https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs/auth/providers)
- [Email Templates](https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs/auth/templates)
- [SMTP Settings](https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs/settings/auth)

## 📝 Notes

- Free Supabase tier includes 3 emails/hour with built-in service
- For production apps, always use custom SMTP
- Email confirmations improve security and reduce spam accounts
- Users can request a new confirmation email if the first expires