# SMTP Configuration for Syrena Travel

## Quick Setup Options

### Option 1: Gmail (Easiest for Testing)

**Sender Details:**
- **Sender email**: your.email@gmail.com
- **Sender name**: Syrena Travel

**SMTP Provider Settings:**
- **Host**: smtp.gmail.com
- **Port**: 587
- **Username**: your.email@gmail.com
- **Password**: [Your Gmail App Password - see below]
- **Minimum interval**: 60 seconds

#### How to get Gmail App Password:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (required)
3. Search for "App passwords"
4. Create a new app password for "Mail"
5. Copy the 16-character password (no spaces)
6. Use this password in the SMTP settings

---

### Option 2: Resend (Recommended - Free Tier Available)

**First, sign up at**: https://resend.com (free tier includes 3,000 emails/month)

**Sender Details:**
- **Sender email**: onboarding@resend.dev (or your verified domain)
- **Sender name**: Syrena Travel

**SMTP Provider Settings:**
- **Host**: smtp.resend.com
- **Port**: 587
- **Username**: resend
- **Password**: re_xxxxxxxxxxxxx (your Resend API key)
- **Minimum interval**: 60 seconds

---

### Option 3: SendGrid (Professional)

**First, sign up at**: https://sendgrid.com (free tier includes 100 emails/day)

**Sender Details:**
- **Sender email**: noreply@syrenatavel.com (or any email)
- **Sender name**: Syrena Travel

**SMTP Provider Settings:**
- **Host**: smtp.sendgrid.net
- **Port**: 587
- **Username**: apikey
- **Password**: SG.xxxxxxxxxxxxx (your SendGrid API key)
- **Minimum interval**: 60 seconds

---

### Option 4: Brevo (formerly Sendinblue)

**First, sign up at**: https://www.brevo.com (free tier includes 300 emails/day)

**Sender Details:**
- **Sender email**: noreply@syrenatavel.com
- **Sender name**: Syrena Travel

**SMTP Provider Settings:**
- **Host**: smtp-relay.brevo.com
- **Port**: 587
- **Username**: [Your Brevo login email]
- **Password**: [Your SMTP key from Brevo]
- **Minimum interval**: 60 seconds

---

## 🚀 Quickest Setup (Gmail)

Since you need this working immediately, use Gmail:

1. Fill in these exact values in your Supabase form:

**Sender email**: `your.gmail@gmail.com` (replace with your Gmail)
**Sender name**: `Syrena Travel`
**Host**: `smtp.gmail.com`
**Port**: `587`
**Username**: `your.gmail@gmail.com` (same as sender email)
**Password**: `xxxx xxxx xxxx xxxx` (16-char app password from Google)
**Minimum interval**: `60`

2. Click "Save" at the bottom of the form

3. Test by signing up with a new account

## ⚠️ Important Notes

- **Port 465** is for SSL (older method)
- **Port 587** is for TLS (recommended)
- **Port 25** should be avoided (often blocked)
- Gmail limits: 500 emails/day for personal accounts
- Always use App Passwords, not your regular password
- Emails might go to spam initially - mark as "not spam" to train filters

## 🔍 Testing Your Configuration

After saving:
1. Go to Authentication → Email Templates
2. Send a test email
3. Check inbox and spam folder
4. If not received within 5 minutes, check SMTP settings

## 💡 Pro Tips

- Start with Gmail for quick testing
- Move to Resend or SendGrid for production
- Always use a "noreply" or "hello" email for sender
- Keep minimum interval at 60 seconds to avoid rate limits