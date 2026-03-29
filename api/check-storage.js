const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkStorage() {
  console.log('Checking storage buckets...\n');
  
  // List all buckets
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }
  
  console.log('Existing buckets:', buckets.map(b => b.name).join(', '));
  
  const placePhotosBucket = buckets.find(b => b.name === 'place-photos');
  
  if (!placePhotosBucket) {
    console.log('\n❌ place-photos bucket does NOT exist');
    console.log('\nTo create it, run this in Supabase SQL Editor:');
    console.log(`
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('place-photos', 'place-photos', true);

-- Set up RLS policies for the bucket
CREATE POLICY "Anyone can view place photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'place-photos');

CREATE POLICY "Authenticated users can upload place photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'place-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own place photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'place-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
    `);
  } else {
    console.log('\n✅ place-photos bucket exists');
    console.log('Bucket details:', placePhotosBucket);
  }
}

checkStorage().then(() => process.exit(0));
