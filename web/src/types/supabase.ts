export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          bio: string | null
          profile_picture: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          bio?: string | null
          profile_picture?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          bio?: string | null
          profile_picture?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      places: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          category: string | null
          address: string | null
          location: unknown | null
          lat: number | null
          lng: number | null
          google_place_id: string | null
          photo_url: string | null
          rating: number | null
          price_level: number | null
          notes: string | null
          visited: boolean
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          category?: string | null
          address?: string | null
          location?: unknown | null
          lat?: number | null
          lng?: number | null
          google_place_id?: string | null
          photo_url?: string | null
          rating?: number | null
          price_level?: number | null
          notes?: string | null
          visited?: boolean
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          category?: string | null
          address?: string | null
          location?: unknown | null
          lat?: number | null
          lng?: number | null
          google_place_id?: string | null
          photo_url?: string | null
          rating?: number | null
          price_level?: number | null
          notes?: string | null
          visited?: boolean
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      friends: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      place_categories: {
        Row: {
          id: string
          name: string
          icon: string | null
          display_order: number | null
        }
        Insert: {
          id: string
          name: string
          icon?: string | null
          display_order?: number | null
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          display_order?: number | null
        }
      }
    }
    Functions: {
      get_nearby_friend_places: {
        Args: {
          user_lat: number
          user_lng: number
          radius_meters?: number
        }
        Returns: {
          id: string
          name: string
          description: string | null
          category: string | null
          lat: number | null
          lng: number | null
          distance_meters: number
          user_id: string
          username: string
        }[]
      }
    }
  }
}