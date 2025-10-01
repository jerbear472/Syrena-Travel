'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { X, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const supabase = createClient();

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (isSignUp && !username) {
      setError('Username is required for sign up');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              full_name: fullName
            },
            emailRedirectTo: window.location.origin
          }
        });

        if (error) {
          if (error.message.includes('not enabled')) {
            setError('Email confirmations are not enabled. Please contact support.');
          } else {
            setError(error.message);
          }
        } else if (data.user) {
          if (data.user.email && !data.user.confirmed_at) {
            setSuccess('Account created! Please check your email for confirmation.');
            setTimeout(() => {
              setIsSignUp(false);
              resetForm();
            }, 5000);
          } else {
            setSuccess('Account created! Welcome to Syrena!');
            setTimeout(() => {
              onSuccess();
            }, 2000);
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Please check your email and confirm your account first');
          } else {
            setError(error.message);
          }
        } else if (data.user) {
          setSuccess('Welcome back!');
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setFullName('');
    setError('');
    setSuccess('');
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setError(`Failed to sign in with ${provider}`);
      }
    } catch (error) {
      setError(`Failed to sign in with ${provider}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop-clean z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="modal-clean w-full max-w-md my-8 animate-scale-in">
        {/* Header */}
        <div className="relative p-6 pb-0">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 btn-icon"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-cream rounded-xl border-2 border-warm-stone overflow-hidden">
              <Image
                src="/bluelyre.png"
                alt="Syrena"
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            </div>
            <h2 className="heading-2 mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-caption">
              {isSignUp
                ? 'Start your travel journey'
                : 'Continue exploring the world'}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {(success || error) && (
          <div className="px-6">
            {success && (
              <div className="alert alert-success animate-slide-up">
                <CheckCircle size={16} className="flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="alert alert-error animate-slide-up">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="p-6 space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="text-label block mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-terracotta" size={16} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-clean pl-10"
                    placeholder="johndoe"
                    required={isSignUp}
                  />
                </div>
              </div>

              <div>
                <label className="text-label block mb-2">
                  Full Name <span className="text-terracotta-light font-normal italic">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-clean"
                  placeholder="John Doe"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-label block mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-terracotta" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-clean pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-label block mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-terracotta" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-clean pl-10 pr-10"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-terracotta hover:text-rust transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
            {isSignUp && (
              <p className="text-xs text-terracotta mt-1 italic">
                Must be at least 6 characters
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner-minimal border-white border-t-white/30" />
                  <span>Processing...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </div>

          {!isSignUp && (
            <button
              type="button"
              className="w-full text-sm text-terracotta hover:text-rust py-1 transition-colors font-serif italic"
              onClick={() => {
                alert('Password recovery coming soon! Please contact support.');
              }}
            >
              Forgot your password?
            </button>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-sand" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-off-white px-3 text-terracotta uppercase tracking-wider font-sans font-semibold">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="btn-secondary py-2.5 px-4 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-sm">Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('github')}
              className="btn-secondary py-2.5 px-4 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="font-medium text-sm">GitHub</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6 text-center border-t-2 border-sand pt-4">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
              resetForm();
            }}
            className="text-sm text-terracotta hover:text-rust transition-colors font-serif"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}