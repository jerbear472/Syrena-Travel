import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { Client } from '@googlemaps/google-maps-services-js';

export const placesRouter = Router();

// Initialize Google Maps client
const googleMapsClient = new Client({});

// In-memory cache with TTL (24 hours for place details)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
const placeCache = new Map<string, { data: any; timestamp: number }>();

// Cache helper functions
function getCached(key: string): any | null {
  const cached = placeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache] HIT for key: ${key.substring(0, 30)}...`);
    return cached.data;
  }
  if (cached) {
    placeCache.delete(key); // Remove stale entry
  }
  return null;
}

function setCache(key: string, data: any): void {
  // Limit cache size to prevent memory issues (max 1000 entries)
  if (placeCache.size > 1000) {
    const oldestKey = placeCache.keys().next().value;
    if (oldestKey) placeCache.delete(oldestKey);
  }
  placeCache.set(key, { data, timestamp: Date.now() });
  console.log(`[Cache] SET for key: ${key.substring(0, 30)}... (total: ${placeCache.size})`);
}

// Get Google Places details from coordinates - no auth required for this endpoint
placesRouter.get('/', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    console.log(`[Google Places API] Request received for coordinates: ${lat}, ${lng}`);

    // Check cache first (round coordinates to 5 decimal places for cache key)
    const cacheKey = `coords:${parseFloat(lat as string).toFixed(5)},${parseFloat(lng as string).toFixed(5)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    if (!lat || !lng) {
      console.log('[Google Places API] Error: Missing coordinates');
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.log('[Google Places API] Error: Invalid coordinates');
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key') {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    const genericTypes = ['locality', 'political', 'neighborhood', 'administrative_area_level_1',
                         'administrative_area_level_2', 'country', 'postal_code', 'sublocality'];

    // Helper to filter for real places
    const filterRealPlaces = (results: any[]) => {
      return results.filter(place => {
        const hasGenericType = place.types?.some((type: string) => genericTypes.includes(type));
        const hasSpecificType = place.types?.some((type: string) =>
          ['restaurant', 'cafe', 'bar', 'store', 'lodging', 'museum', 'park',
           'tourist_attraction', 'point_of_interest', 'establishment'].includes(type)
        );
        return hasSpecificType && !hasGenericType;
      });
    };

    // Helper to get place details
    const getPlaceDetails = async (placeId: string) => {
      const detailsResponse = await googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          fields: ['name', 'rating', 'price_level', 'photos', 'types', 'formatted_address', 'business_status'],
          key: apiKey
        }
      });

      const details = detailsResponse.data.result;
      if (!details) return null;

      return {
        placeId: placeId,
        name: details.name || '',
        rating: details.rating || 0,
        priceLevel: details.price_level || 0,
        photos: details.photos
          ? details.photos.slice(0, 3).map(photo => {
              if (photo.photo_reference) {
                return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${apiKey}`;
              }
              return null;
            }).filter(url => url !== null)
          : [],
        types: details.types || [],
        address: details.formatted_address || '',
        businessStatus: details.business_status
      };
    };

    // First, try to find nearby places with a tight radius (50m to catch nearby places)
    const nearbyResponse = await googleMapsClient.placesNearby({
      params: {
        location: { lat: latitude, lng: longitude },
        radius: 50,
        key: apiKey
      }
    });

    let realPlaces = nearbyResponse.data.results ? filterRealPlaces(nearbyResponse.data.results) : [];

    // If not enough places found, try wider radius
    if (realPlaces.length < 3) {
      const widerResponse = await googleMapsClient.placesNearby({
        params: {
          location: { lat: latitude, lng: longitude },
          radius: 100,
          key: apiKey
        }
      });

      if (widerResponse.data.results) {
        const widerPlaces = filterRealPlaces(widerResponse.data.results);
        // Merge and dedupe by place_id
        const existingIds = new Set(realPlaces.map(p => p.place_id));
        for (const place of widerPlaces) {
          if (!existingIds.has(place.place_id)) {
            realPlaces.push(place);
            existingIds.add(place.place_id);
          }
        }
      }
    }

    // If no places found, return null
    if (realPlaces.length === 0) {
      return res.json({ placeDetails: null, nearbyAlternatives: [] });
    }

    // Get details for the primary place (first/closest)
    const primaryPlaceId = realPlaces[0].place_id;
    const primaryDetails = await getPlaceDetails(primaryPlaceId);

    if (!primaryDetails) {
      return res.json({ placeDetails: null, nearbyAlternatives: [] });
    }

    // Get basic info for alternatives (up to 5 more places)
    const alternativePlaces = realPlaces.slice(1, 6).map(place => ({
      placeId: place.place_id,
      name: place.name || '',
      address: place.vicinity || '',
      types: place.types || [],
    }));

    console.log(`[Google Places API] Found place: ${primaryDetails.name}, with ${alternativePlaces.length} alternatives`);
    const response = {
      placeDetails: primaryDetails,
      nearbyAlternatives: alternativePlaces
    };

    // Cache the result
    setCache(cacheKey, response);

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching place details:', error);
    res.status(500).json({
      error: 'Failed to fetch place details',
      message: error.message
    });
  }
});

// Get detailed info for a specific place by place_id - no auth required
placesRouter.get('/details', async (req, res) => {
  try {
    const { place_id } = req.query;

    if (!place_id) {
      return res.status(400).json({ error: 'place_id is required' });
    }

    // Check cache first
    const cacheKey = `place:${place_id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key') {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    const detailsResponse = await googleMapsClient.placeDetails({
      params: {
        place_id: place_id as string,
        fields: ['name', 'rating', 'price_level', 'photos', 'types', 'formatted_address', 'business_status'],
        key: apiKey
      }
    });

    const details = detailsResponse.data.result;
    if (!details) {
      return res.json({ placeDetails: null });
    }

    const formattedDetails = {
      placeId: place_id,
      name: details.name || '',
      rating: details.rating || 0,
      priceLevel: details.price_level || 0,
      photos: details.photos
        ? details.photos.slice(0, 3).map(photo => {
            if (photo.photo_reference) {
              return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${apiKey}`;
            }
            return null;
          }).filter(url => url !== null)
        : [],
      types: details.types || [],
      address: details.formatted_address || '',
      businessStatus: details.business_status
    };

    console.log(`[Google Places API] Fetched details for: ${formattedDetails.name}`);
    const response = { placeDetails: formattedDetails };

    // Cache the result
    setCache(cacheKey, response);

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching place details:', error);
    res.status(500).json({
      error: 'Failed to fetch place details',
      message: error.message
    });
  }
});

// All other places routes require authentication
placesRouter.use(verifyToken);

placesRouter.post('/', (req, res) => {
  res.json({ message: 'Save new place' });
});

placesRouter.get('/nearby', (req, res) => {
  res.json({ message: 'Get nearby places from friends' });
});

placesRouter.delete('/:id', (req, res) => {
  res.json({ message: 'Delete place' });
});