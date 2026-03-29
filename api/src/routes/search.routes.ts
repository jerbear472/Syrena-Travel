import { Router, Request, Response } from 'express';
import { Client } from '@googlemaps/google-maps-services-js';

export const searchRouter = Router();

// Initialize Google Maps client
const googleMapsClient = new Client({});

// In-memory cache with TTL
const AUTOCOMPLETE_CACHE_TTL = 60 * 60 * 1000; // 1 hour for autocomplete
const DETAILS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for place details
const searchCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache helper functions
function getCached(key: string): any | null {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log(`[Search Cache] HIT for key: ${key.substring(0, 40)}...`);
    return cached.data;
  }
  if (cached) {
    searchCache.delete(key); // Remove stale entry
  }
  return null;
}

function setCache(key: string, data: any, ttl: number): void {
  // Limit cache size to prevent memory issues (max 2000 entries)
  if (searchCache.size > 2000) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, timestamp: Date.now(), ttl });
  console.log(`[Search Cache] SET for key: ${key.substring(0, 40)}... (total: ${searchCache.size})`);
}

// Autocomplete search endpoint - no auth required
searchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { query, place_id, lat, lng } = req.query;

    // If place_id is provided, get place details instead
    if (place_id && typeof place_id === 'string') {
      return getPlaceDetails(place_id, res);
    }

    console.log(`[Search API] Autocomplete request for: "${query}"`);

    if (!query || typeof query !== 'string' || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters', predictions: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key') {
      return res.status(500).json({ error: 'Google Maps API key not configured', predictions: [] });
    }

    // Build location bias if coordinates provided
    const locationParams: any = {};
    if (lat && lng) {
      locationParams.location = {
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string)
      };
      locationParams.radius = 50000; // 50km radius bias
    }

    // Check cache first
    const cacheKey = `autocomplete:${query.toLowerCase()}:${lat || ''}:${lng || ''}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Use Place Autocomplete API with retry on 429
    let response;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        response = await googleMapsClient.placeAutocomplete({
          params: {
            input: query,
            key: apiKey,
            types: 'establishment', // Focus on businesses/places
            ...locationParams
          }
        });
        // If we get a rate limit (429), wait and retry
        if (response.data.status === 'OVER_QUERY_LIMIT' && retries < maxRetries) {
          retries++;
          console.log(`[Search API] Rate limited, retry ${retries}/${maxRetries} after ${retries * 1000}ms`);
          await new Promise(resolve => setTimeout(resolve, retries * 1000));
          continue;
        }
        break;
      } catch (err: any) {
        if (err.response?.status === 429 && retries < maxRetries) {
          retries++;
          console.log(`[Search API] 429 rate limited, retry ${retries}/${maxRetries} after ${retries * 1000}ms`);
          await new Promise(resolve => setTimeout(resolve, retries * 1000));
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      return res.status(429).json({ error: 'Rate limited - please try again', predictions: [] });
    }

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('[Search API] Autocomplete error:', response.data.status);
      if (response.data.status === 'OVER_QUERY_LIMIT') {
        return res.status(429).json({ error: 'Google API rate limited - please wait a moment', predictions: [] });
      }
      return res.status(500).json({ error: 'Search failed', status: response.data.status, predictions: [] });
    }

    const predictions = response.data.predictions.map(prediction => ({
      place_id: prediction.place_id,
      description: prediction.description,
      structured_formatting: {
        main_text: prediction.structured_formatting?.main_text || prediction.description,
        secondary_text: prediction.structured_formatting?.secondary_text || ''
      },
      types: prediction.types || []
    }));

    console.log(`[Search API] Found ${predictions.length} results for "${query}"`);
    const responseData = { predictions };

    // Cache the result (1 hour for autocomplete)
    setCache(cacheKey, responseData, AUTOCOMPLETE_CACHE_TTL);

    res.json(responseData);
  } catch (error: any) {
    console.error('[Search API] Error:', error.message);
    res.status(500).json({ error: 'Search failed', message: error.message, predictions: [] });
  }
});

// Get place details by place_id
searchRouter.get('/details', async (req: Request, res: Response) => {
  const { place_id } = req.query;

  if (!place_id || typeof place_id !== 'string') {
    return res.status(400).json({ error: 'place_id is required' });
  }

  return getPlaceDetails(place_id, res);
});

// Helper function to get place details
async function getPlaceDetails(place_id: string, res: Response) {
  try {
    console.log(`[Search API] Place details request for: ${place_id}`);

    // Check cache first
    const cacheKey = `details:${place_id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key') {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    const response = await googleMapsClient.placeDetails({
      params: {
        place_id: place_id,
        fields: ['name', 'geometry', 'formatted_address', 'rating', 'price_level', 'photos', 'types', 'opening_hours'],
        key: apiKey
      }
    });

    if (response.data.status !== 'OK') {
      console.error('[Search API] Place details error:', response.data.status);
      return res.status(404).json({ error: 'Place not found', status: response.data.status });
    }

    const place = response.data.result;

    // Format photos with URLs
    const photos = place.photos
      ? place.photos.slice(0, 5).map(photo => {
          if (photo.photo_reference) {
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`;
          }
          return null;
        }).filter(url => url !== null)
      : [];

    const result = {
      place_id: place_id,
      name: place.name,
      geometry: place.geometry,
      formatted_address: place.formatted_address,
      rating: place.rating,
      price_level: place.price_level,
      photos,
      types: place.types,
      opening_hours: place.opening_hours
    };

    console.log(`[Search API] Found place details for: ${place.name}`);
    const responseData = { result };

    // Cache the result (24 hours for place details)
    setCache(cacheKey, responseData, DETAILS_CACHE_TTL);

    res.json(responseData);
  } catch (error: any) {
    console.error('[Search API] Place details error:', error.message);
    res.status(500).json({ error: 'Failed to get place details', message: error.message });
  }
}
