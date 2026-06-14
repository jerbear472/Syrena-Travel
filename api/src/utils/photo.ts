// Public base URL of this API, used to build absolute photo-proxy URLs that
// the mobile app can render directly. Override with PUBLIC_API_URL in env.
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || 'https://api.syrena.travel').replace(/\/$/, '');

/**
 * Build a URL to this API's own /api/photo proxy instead of embedding the
 * Google Maps API key in URLs returned to clients.
 */
export function photoProxyUrl(ref: string, maxWidth: number): string {
  return `${PUBLIC_API_URL}/api/photo?ref=${encodeURIComponent(ref)}&w=${maxWidth}`;
}
