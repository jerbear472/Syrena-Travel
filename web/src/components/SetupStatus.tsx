'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function SetupStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm">Checking setup...</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const allConfigured = status.googleMaps.configured && status.supabase.configured && status.supabase.canConnect;

  if (allConfigured) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">All services connected!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 z-50 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Setup Status</h3>
        <button
          onClick={checkStatus}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          {status.googleMaps.configured ? (
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-700">Google Maps</p>
            <p className="text-xs text-gray-500">{status.googleMaps.message}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          {status.supabase.configured && status.supabase.canConnect ? (
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
          ) : status.supabase.configured ? (
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-700">Supabase</p>
            <p className="text-xs text-gray-500">{status.supabase.message}</p>
          </div>
        </div>
      </div>

      {!allConfigured && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-600">
            Add missing keys to <code className="bg-gray-100 px-1 rounded">web/.env.local</code> and restart the server.
          </p>
        </div>
      )}
    </div>
  );
}