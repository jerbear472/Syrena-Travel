import { Platform } from 'react-native';
import Config from 'react-native-config';

// API Configuration
// In development, use local IP for iOS device and 10.0.2.2 for Android emulator
// In production, this should be your deployed API URL

const DEV_API_HOST = Config.DEV_API_HOST || 'localhost';
const DEV_API_PORT = Config.DEV_API_PORT || '5001';
const PROD_API_URL = Config.PROD_API_URL || 'https://api.syrena.travel';

const isDev = __DEV__;

// Resolve the dev host for the current platform
const devHost = Platform.select({
  android: '10.0.2.2',
  default: DEV_API_HOST,
});

export const API_CONFIG = {
  // Base URL for Express API (port 5001)
  baseUrl: isDev
    ? `http://${devHost}:${DEV_API_PORT}`
    : PROD_API_URL,

  // Endpoints
  endpoints: {
    places: '/api/places',
    events: '/api/events',
    search: '/api/search',
    'place-details': '/api/place-details',
  },

  // Timeouts
  timeout: 5000,
};

// Base URL for Next.js web API (port 3001 in dev)
export const WEB_API_URL = isDev
  ? `http://${devHost}:3001`
  : 'https://syrena-web-new.vercel.app';

// Helper to build full URL
export const getApiUrl = (endpoint: keyof typeof API_CONFIG.endpoints): string => {
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
};

export default API_CONFIG;
