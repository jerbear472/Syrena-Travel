// Supabase Edge Function to send push notifications via Expo
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, any>
  sound?: string
  badge?: number
}

serve(async (req) => {
  try {
    const { user_id, title, body, data } = await req.json()

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user's push token
    const { data: tokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id)
      .single()

    if (tokenError || !tokenData?.token) {
      console.log('No push token found for user:', user_id)
      return new Response(
        JSON.stringify({ success: false, error: 'No push token' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send push notification via Expo
    const message: PushMessage = {
      to: tokenData.token,
      title,
      body,
      data: data || {},
      sound: 'default',
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()
    console.log('Expo push result:', result)

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Push notification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
