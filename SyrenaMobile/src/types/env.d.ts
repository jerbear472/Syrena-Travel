declare module 'react-native-config' {
  export interface NativeConfig {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    DEV_API_HOST: string;
    DEV_API_PORT: string;
    PROD_API_URL: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
