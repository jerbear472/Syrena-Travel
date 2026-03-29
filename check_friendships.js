const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './api/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkFriendships() {
  console.log('Checking friendships table...\n');
  
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Accepted friendships:', JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    const requesterIds = [...new Set(data.map(f => f.requester_id))];
    const addresseeIds = [...new Set(data.map(f => f.addressee_id))];
    const allIds = [...new Set([...requesterIds, ...addresseeIds])];
    
    console.log('\n\nFetching profiles for user IDs:', allIds);
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, email')
      .in('id', allIds);
    
    if (profileError) {
      console.error('Profile error:', profileError);
    } else {
      console.log('\nProfiles:', JSON.stringify(profiles, null, 2));
    }
  }
  
  process.exit(0);
}

checkFriendships();
