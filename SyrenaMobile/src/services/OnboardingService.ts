import { supabase } from '../lib/supabase';
import { getCityFromCoordinates } from '../utils/location';
import { WEB_API_URL } from '../config/api';

interface OnboardingCallbacks {
  onStart?: () => void;
  onProgress?: (message: string) => void;
  onComplete?: (placeCount: number) => void;
  onError?: (error: string) => void;
}

export async function runOnboardingIfNeeded(
  userId: string,
  location: { latitude: number; longitude: number },
  callbacks?: OnboardingCallbacks,
): Promise<boolean> {
  try {
    // 1. Check if onboarding is needed
    console.log(`[Onboarding] Checking for user ${userId.substring(0, 8)}...`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile row doesn't exist yet (brand new user) — create it
      console.log('[Onboarding] No profile found, creating one for new user');
      const { error: createError } = await supabase
        .from('profiles')
        .insert({ id: userId, onboarding_complete: false });
      if (createError) {
        console.error('[Onboarding] Failed to create profile:', createError.message);
        return false;
      }
    } else if (profileError) {
      console.error('[Onboarding] Failed to check profile:', profileError.message);
      return false;
    } else if (profile?.onboarding_complete) {
      console.log('[Onboarding] Already complete, skipping');
      return false;
    }

    callbacks?.onStart?.();

    // 2. Resolve city name from coordinates (non-blocking — fallback to 'your area')
    callbacks?.onProgress?.('Finding your city...');
    let city: string | null = null;
    try {
      city = await getCityFromCoordinates(location.latitude, location.longitude);
    } catch (err) {
      console.log('[Onboarding] City resolution failed, using coordinates only');
    }

    // 3. Call the onboarding-places API
    console.log(`[Onboarding] Calling API: ${WEB_API_URL}/api/onboarding-places (city: ${city || 'your area'})`);
    callbacks?.onProgress?.('Curating your personal guide...');
    const response = await fetch(`${WEB_API_URL}/api/onboarding-places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: location.latitude,
        lng: location.longitude,
        city: city || 'your area',
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[Onboarding] API returned ${response.status}: ${errData.error}`);
      throw new Error(errData.error || 'Failed to generate places');
    }

    const data = await response.json();
    console.log(`[Onboarding] API returned ${data.places?.length || 0} places`);

    if (!data.places || data.places.length === 0) {
      // No places generated — mark complete so we don't retry endlessly
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', userId);
      callbacks?.onComplete?.(0);
      return false;
    }

    // 4. Batch-insert all places into Supabase with source='syrena'
    // Only include places that have a Google photo
    callbacks?.onProgress?.('Adding Syrena Picks to your map...');
    const placesWithPhotos = data.places.filter((place: any) => place.photo_url);
    console.log(`[Onboarding] ${placesWithPhotos.length} of ${data.places.length} places have Google photos`);

    if (placesWithPhotos.length === 0) {
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', userId);
      callbacks?.onComplete?.(0);
      return false;
    }

    const placesToInsert = placesWithPhotos.map((place: any) => ({
      name: place.name,
      description: place.description,
      category: place.category,
      lat: place.lat,
      lng: place.lng,
      address: place.address,
      photo_url: place.photo_url,
      price_level: place.price_level || null,
      rating: place.rating || null,
      google_place_id: place.google_place_id || null,
      city: place.city || city || null,
      user_id: userId,
      source: 'syrena',
    }));

    const { error: insertError } = await supabase
      .from('places')
      .insert(placesToInsert);

    if (insertError) {
      console.error('[Onboarding] Supabase insert failed:', insertError.message);
      throw insertError;
    }

    // 5. Mark onboarding complete
    await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', userId);

    callbacks?.onComplete?.(data.places.length);
    console.log(`[Onboarding] Successfully added ${data.places.length} Syrena Picks`);
    return true;
  } catch (error: any) {
    console.error('[Onboarding] Error:', error.message || error);
    callbacks?.onError?.(error.message || 'Onboarding failed');
    return false;
  }
}
