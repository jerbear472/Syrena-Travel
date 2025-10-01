import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fisghxjiurwrafgfzcxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2doeGppdXJ3cmFmZ2Z6Y3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMjY1NjQsImV4cCI6MjA3NDYwMjU2NH0.HoSozz-oo-YvmWElLzzlRnSTGvsjf9kr0UOi-7QUEmE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});