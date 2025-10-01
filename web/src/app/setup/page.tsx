'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Copy, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SetupPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sqlCopied, setSqlCopied] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/verify-setup');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to check setup status:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const copySqlToClipboard = async () => {
    try {
      const response = await fetch('/setup-supabase.sql');
      const sql = await response.text();
      await navigator.clipboard.writeText(sql);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy SQL:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking setup status...</p>
        </div>
      </div>
    );
  }

  const allReady = status?.googleMaps?.configured && status?.supabase?.configured && status?.supabase?.canConnect;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Syrena Travel Setup</h1>
          <p className="text-gray-600 mb-8">Let's get your travel map platform up and running!</p>

          {/* Status Cards */}
          <div className="space-y-4 mb-8">
            {/* Google Maps Status */}
            <div className={`border-2 rounded-xl p-4 ${
              status?.googleMaps?.configured
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-start gap-3">
                {status?.googleMaps?.configured ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Google Maps API</h3>
                  <p className="text-sm text-gray-600 mt-1">{status?.googleMaps?.message}</p>
                  {!status?.googleMaps?.configured && (
                    <div className="mt-3 p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">Add to <code className="bg-gray-100 px-1 rounded">web/.env.local</code>:</p>
                      <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs">
                        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
                      </code>
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                      >
                        Get API Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Supabase Status */}
            <div className={`border-2 rounded-xl p-4 ${
              status?.supabase?.configured && status?.supabase?.canConnect
                ? 'border-green-200 bg-green-50'
                : status?.supabase?.configured
                ? 'border-amber-200 bg-amber-50'
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-start gap-3">
                {status?.supabase?.configured && status?.supabase?.canConnect ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                ) : status?.supabase?.configured ? (
                  <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Supabase Authentication & Database</h3>
                  <p className="text-sm text-gray-600 mt-1">{status?.supabase?.message}</p>

                  {status?.supabase?.configured && status?.supabase?.message?.includes('SQL') && (
                    <div className="mt-4 space-y-3">
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">📋 Quick Setup Steps:</h4>
                        <ol className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="font-medium text-blue-600">1.</span>
                            <div className="flex-1">
                              <button
                                onClick={copySqlToClipboard}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                              >
                                <Copy className="w-3 h-3" />
                                {sqlCopied ? 'Copied!' : 'Copy SQL Script'}
                              </button>
                              <p className="text-xs text-gray-500 mt-1">Click to copy the database setup script</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-medium text-blue-600">2.</span>
                            <div className="flex-1">
                              <a
                                href="https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs/sql/new"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                              >
                                Open Supabase SQL Editor <ExternalLink className="w-3 h-3" />
                              </a>
                              <p className="text-xs text-gray-500 mt-1">Opens in a new tab</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-medium text-blue-600">3.</span>
                            <div className="flex-1">
                              <p className="text-gray-700">Paste the SQL script and click "Run"</p>
                              <p className="text-xs text-gray-500 mt-1">This creates all tables and security policies</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-medium text-blue-600">4.</span>
                            <div className="flex-1">
                              <button
                                onClick={checkStatus}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium"
                              >
                                Refresh Status
                              </button>
                              <p className="text-xs text-gray-500 mt-1">Check if tables are created</p>
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {!status?.supabase?.configured && (
                    <div className="mt-3 p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">Add to <code className="bg-gray-100 px-1 rounded">web/.env.local</code>:</p>
                      <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs">
                        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
                      </code>
                      <a
                        href="https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs/settings/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                      >
                        Get Anon Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {allReady ? (
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all transform hover:scale-105"
              >
                Launch Syrena Travel <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-sm text-gray-500 mt-3">Everything is ready! Start exploring.</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600">Complete the setup steps above to get started</p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Need Help?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">N</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Next.js Docs</p>
                <p className="text-xs text-gray-500">Framework documentation</p>
              </div>
            </a>
            <a
              href="https://supabase.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Supabase Docs</p>
                <p className="text-xs text-gray-500">Auth & database guide</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}