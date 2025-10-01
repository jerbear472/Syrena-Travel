import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const results = {
    googleMaps: {
      configured: false,
      message: ''
    },
    supabase: {
      configured: false,
      canConnect: false,
      message: ''
    }
  };

  // Check Google Maps API Key
  const gmapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (gmapsKey && gmapsKey !== 'your-google-maps-api-key-here') {
    results.googleMaps.configured = true;
    results.googleMaps.message = 'API key is configured';
  } else {
    results.googleMaps.message = 'Please add your Google Maps API key to .env.local';
  }

  // Check Supabase Configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && supabaseKey !== 'your-anon-key-here') {
    results.supabase.configured = true;

    // Try to connect to Supabase
    try {
      const supabase = createClient();

      // First test basic auth connection
      const { data: { session } } = await supabase.auth.getSession();

      // Try to check if tables exist
      const { error } = await supabase.from('profiles').select('count').limit(0);

      if (!error) {
        results.supabase.canConnect = true;
        results.supabase.message = 'Successfully connected to Supabase';
      } else if (error.message.includes('schema cache')) {
        results.supabase.canConnect = true;
        results.supabase.message = 'Connected! Run the SQL setup script to create tables';
      } else {
        results.supabase.message = `Supabase configured but connection failed: ${error.message}`;
      }
    } catch (error: any) {
      results.supabase.message = `Supabase error: ${error.message}`;
    }
  } else {
    results.supabase.message = 'Please add your Supabase anon key to .env.local';
  }

  return NextResponse.json(results);
}