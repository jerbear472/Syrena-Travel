'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'reset-password' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing...');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Small delay to ensure URL hash is available after redirect
    const timer = setTimeout(() => {
      handleAuth();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handleAuth = async () => {
    try {
      const fullUrl = window.location.href;
      const hash = window.location.hash;
      const search = window.location.search;

      console.log('Auth confirm - Full URL:', fullUrl);
      console.log('Auth confirm - Hash:', hash);
      console.log('Auth confirm - Search:', search);

      // Parse parameters from hash (Supabase puts tokens here)
      const hashParams = new URLSearchParams(hash.substring(1));
      const searchParams = new URLSearchParams(search);

      // Get tokens and type from hash (Supabase format)
      let accessToken = hashParams.get('access_token');
      let refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type') || searchParams.get('type');
      const error = hashParams.get('error') || searchParams.get('error');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
      const tokenHash = searchParams.get('token_hash');
      const code = searchParams.get('code');

      console.log('Parsed params:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type,
        error,
        hasTokenHash: !!tokenHash,
        hasCode: !!code,
      });

      // Handle errors from Supabase
      if (error || errorDescription) {
        setStatus('error');
        setMessage(errorDescription || error || 'Authentication failed');
        return;
      }

      // Initialize Supabase client
      const supabase = createClient();

      // If we have a code (PKCE flow), exchange it for tokens
      if (code) {
        console.log('Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          setStatus('error');
          setMessage(exchangeError.message);
          return;
        }
        if (data.session) {
          accessToken = data.session.access_token;
          refreshToken = data.session.refresh_token;
          console.log('Got tokens from code exchange');
        }
      }

      // If we have a token_hash (email verification), verify it
      if (tokenHash && type && !accessToken) {
        console.log('Verifying token hash...');
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'recovery' | 'signup' | 'email',
        });
        if (verifyError) {
          console.error('Token verification error:', verifyError);
          setStatus('error');
          setMessage(verifyError.message);
          return;
        }
        if (data.session) {
          accessToken = data.session.access_token;
          refreshToken = data.session.refresh_token;
          console.log('Got tokens from token hash verification');
        }
      }

      // If still no tokens, try to get session (Supabase may have set it automatically from hash)
      if (!accessToken || !refreshToken) {
        console.log('Trying to get session from Supabase...');
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          accessToken = sessionData.session.access_token;
          refreshToken = sessionData.session.refresh_token;
          console.log('Got tokens from existing session');
        }
      }

      // Check if we have tokens
      if (accessToken && refreshToken) {
        // Set the session in Supabase so updateUser will work
        console.log('Setting session with tokens...');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          setStatus('error');
          setMessage(sessionError.message);
          return;
        }

        console.log('Session set successfully');

        // Check if this is a recovery/password reset - show password reset form
        if (type === 'recovery') {
          setStatus('reset-password');
          setMessage('');
          return;
        }

        // For signup/email confirmation, just show success
        setStatus('success');
        setMessage('Email confirmed! You can now open the app and sign in.');
        return;
      }

      // No tokens found - show error
      setStatus('error');
      setMessage('Invalid or expired link. Please request a new password reset from the app.');

    } catch (err: any) {
      console.error('Auth error:', err);
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred');
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setUpdating(true);
    setMessage('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      // Sign out after password update
      await supabase.auth.signOut();

      setStatus('success');
      setMessage('Password updated successfully! You can now sign in with your new password.');
    } catch (err: any) {
      console.error('Password update error:', err);
      setMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E3A5F 0%, #0D264C 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#FFFBF5',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #E2E8F0',
              borderTopColor: '#1E3A5F',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h1 style={{
              color: '#1E3A5F',
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '12px',
            }}>
              Processing
            </h1>
            <p style={{
              color: '#5A7184',
              fontSize: '16px',
            }}>
              {message}
            </p>
          </>
        )}

        {status === 'reset-password' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(30, 58, 95, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h1 style={{
              color: '#1E3A5F',
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '8px',
            }}>
              Reset Password
            </h1>

            <p style={{
              color: '#5A7184',
              fontSize: '14px',
              marginBottom: '24px',
            }}>
              Enter your new password below
            </p>

            {message && (
              <p style={{
                color: '#EF4444',
                fontSize: '14px',
                marginBottom: '16px',
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
              }}>
                {message}
              </p>
            )}

            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: '#1E3A5F',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '6px',
              }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    fontSize: '16px',
                    border: '2px solid #E2E8F0',
                    borderRadius: '12px',
                    outline: 'none',
                    background: '#F8F9FA',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A7184" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#1E3A5F',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '6px',
              }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '12px',
                  outline: 'none',
                  background: '#F8F9FA',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <p style={{
              color: '#8A9BAD',
              fontSize: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Password must be at least 6 characters
            </p>

            <button
              onClick={handleResetPassword}
              disabled={updating}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                background: updating ? '#8A9BAD' : '#1E3A5F',
                border: 'none',
                borderRadius: '12px',
                cursor: updating ? 'not-allowed' : 'pointer',
              }}
            >
              {updating ? 'Updating...' : 'Update Password'}
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#10B981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 style={{
              color: '#1E3A5F',
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '12px',
            }}>
              Success!
            </h1>

            <p style={{
              color: '#5A7184',
              fontSize: '16px',
              marginBottom: '24px',
            }}>
              {message}
            </p>

            <a
              href="syrena://"
              style={{
                display: 'inline-block',
                background: '#1E3A5F',
                color: 'white',
                padding: '14px 32px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '16px',
              }}
            >
              Open Syrena App
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#EF4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>

            <h1 style={{
              color: '#1E3A5F',
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '12px',
            }}>
              Error
            </h1>

            <p style={{
              color: '#5A7184',
              fontSize: '16px',
              marginBottom: '24px',
            }}>
              {message}
            </p>

            <a
              href="syrena://"
              style={{
                display: 'inline-block',
                background: '#1E3A5F',
                color: 'white',
                padding: '14px 32px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '16px',
                marginBottom: '16px',
              }}
            >
              Open App & Try Again
            </a>
            <p style={{
              color: '#8A9BAD',
              fontSize: '14px',
              marginTop: '16px',
            }}>
              Need help? Contact wavesight0@gmail.com
            </p>
          </>
        )}
      </div>
    </div>
  );
}
