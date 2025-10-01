'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface FriendPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export default function FriendPlacesModal({ isOpen, onClose, friend }: FriendPlacesModalProps) {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && friend) {
      loadFriendPlaces();
    }
  }, [isOpen, friend]);

  const loadFriendPlaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('created_by', friend.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading friend places:', error);
      } else {
        setPlaces(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    return '📍'; // Simple placeholder - you can enhance this later
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop-clean z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="modal-clean w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn-icon"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium text-lg">
              {friend.avatar_url ? (
                <img
                  src={friend.avatar_url}
                  alt={friend.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                friend.display_name?.[0]?.toUpperCase() || friend.username?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <h2 className="heading-2">{friend.display_name || friend.username}</h2>
              <p className="text-sm text-gray-500">@{friend.username}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              <span className="ml-3 text-gray-600">Loading places...</span>
            </div>
          ) : places.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No places yet</h3>
              <p className="text-gray-500 text-sm">
                {friend.display_name || friend.username} hasn't saved any places yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">
                  {places.length} {places.length === 1 ? 'Place' : 'Places'}
                </h3>
              </div>

              {places.map((place) => (
                <div
                  key={place.id}
                  className="card-minimal p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getCategoryIcon(place.category)}</span>
                        <h4 className="font-medium text-gray-900">{place.name}</h4>
                      </div>

                      {place.description && (
                        <p className="text-sm text-gray-600 mb-2">{place.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize">{place.category?.replace('-', ' ')}</span>
                        {place.price_level && (
                          <span>{'$'.repeat(place.price_level)}</span>
                        )}
                        <span>{new Date(place.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps?q=${place.lat},${place.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-sm flex items-center gap-1 whitespace-nowrap"
                    >
                      <MapPin size={14} />
                      <span>View on Map</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
