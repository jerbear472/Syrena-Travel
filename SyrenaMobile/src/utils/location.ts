import { WEB_API_URL } from '../config/api';

// Helper to clean city name by removing postal codes and numeric fragments
export const cleanCityName = (rawCity: string): string => {
  if (!rawCity) return '';

  let cleaned = rawCity
    // Remove postal codes with dashes (e.g., "00-453", "12345-6789")
    .replace(/\b\d{2,5}[-–]\d{2,4}\b/g, '')
    // Remove standalone 4-6 digit postal codes
    .replace(/\b\d{4,6}\b/g, '')
    // Remove patterns like "1234 AB" or "AB12 3CD" (UK/Dutch style)
    .replace(/\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/gi, '')
    .replace(/\b\d{4}\s?[A-Z]{2}\b/gi, '')
    // Remove leading/trailing numbers with separators (e.g., "90 - ")
    .replace(/^\d+\s*[-–]\s*/g, '')
    .replace(/\s*[-–]\s*\d+$/g, '')
    // Clean up extra whitespace and dashes
    .replace(/\s*[-–]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
};

// Helper to get city name from coordinates using Google reverse geocoding via backend
export const getCityFromCoordinates = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(`${WEB_API_URL}/api/places?lat=${lat}&lng=${lng}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();

      // The places API returns place info directly (not nested under placeDetails)
      const address = data.address;
      if (address) {
        const parts = address.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) {
          return cleanCityName(parts[1]);
        }
      }
    }
    return null;
  } catch (error) {
    console.log('[Location] Get city error:', error);
    return null;
  }
};
