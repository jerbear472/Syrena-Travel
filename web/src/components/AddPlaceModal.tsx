'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Coffee, Utensils, Camera, Mountain, ShoppingBag, Hotel, Wine, Building2, Gem, Users, MoreHorizontal, Loader2, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';

interface AddPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  onPlaceAdded?: () => void;
  placeDetails?: any;
  loadingPlaceDetails?: boolean;
}

const categories = [
  { id: 'restaurant', name: 'Restaurant', icon: Utensils },
  { id: 'cafe', name: 'Café', icon: Coffee },
  { id: 'bar', name: 'Bar', icon: Wine },
  { id: 'viewpoint', name: 'Viewpoint', icon: Camera },
  { id: 'nature', name: 'Nature', icon: Mountain },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag },
  { id: 'hotel', name: 'Hotel', icon: Hotel },
  { id: 'museum', name: 'Museum', icon: Building2 },
  { id: 'hidden-gem', name: 'Hidden Gem', icon: Gem },
  { id: 'people-watching', name: 'People Watching', icon: Users },
  { id: 'other', name: 'Other', icon: MoreHorizontal },
];

export default function AddPlaceModal({
  isOpen,
  onClose,
  latitude,
  longitude,
  onPlaceAdded,
  placeDetails,
  loadingPlaceDetails
}: AddPlaceModalProps) {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceLevel, setPriceLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userOdysseyIcon, setUserOdysseyIcon] = useState<string | null>(null);

  const supabase = createClient();

  // Load user's odyssey icon
  useEffect(() => {
    const loadUserIcon = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('odyssey_icon')
          .eq('id', user.id)
          .single();

        if (profile?.odyssey_icon) {
          setUserOdysseyIcon(profile.odyssey_icon);
        }
      }
    };
    if (isOpen) {
      loadUserIcon();
    }
  }, [isOpen]);

  // Auto-populate form when place details are loaded
  useEffect(() => {
    if (placeDetails) {
      // Set name
      if (placeDetails.name) {
        setTitle(placeDetails.name);
      }

      // Set price level from Google Places
      if (placeDetails.priceLevel) {
        setPriceLevel(placeDetails.priceLevel);
      }

      // Auto-detect category from Google place types
      if (placeDetails.types && placeDetails.types.length > 0) {
        const types = placeDetails.types;
        if (types.includes('bar') || types.includes('night_club')) {
          setSelectedCategory('bar');
        } else if (types.includes('restaurant') || types.includes('food')) {
          setSelectedCategory('restaurant');
        } else if (types.includes('cafe') || types.includes('coffee')) {
          setSelectedCategory('cafe');
        } else if (types.includes('hotel') || types.includes('lodging')) {
          setSelectedCategory('hotel');
        } else if (types.includes('shopping_mall') || types.includes('store')) {
          setSelectedCategory('shopping');
        } else if (types.includes('museum') || types.includes('art_gallery')) {
          setSelectedCategory('museum');
        } else if (types.includes('park') || types.includes('natural_feature')) {
          setSelectedCategory('nature');
        } else if (types.includes('tourist_attraction')) {
          setSelectedCategory('viewpoint');
        }
      }
    }
  }, [placeDetails]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Please sign in to add places');
        setLoading(false);
        return;
      }

      // Carry over everything Google gave us — address, photo, rating,
      // place id — so the saved place is as rich as a Guide-saved one.
      const placeData = {
        name: title,
        description: comment,
        category: selectedCategory,
        lat: latitude,
        lng: longitude,
        address: placeDetails?.address || null,
        photo_url: placeDetails?.photos?.[0] || null,
        google_place_id: placeDetails?.place_id || null,
        rating: placeDetails?.rating > 0 ? placeDetails.rating : null,
        price_level: priceLevel >= 1 && priceLevel <= 4 ? priceLevel : null,
        user_id: user.id,
        visit_count: 0
      };

      const { error: insertError } = await supabase
        .from('places')
        .insert(placeData);

      if (insertError) throw insertError;

      // Reset form
      setTitle('');
      setComment('');
      setSelectedCategory('');
      setPriceLevel(0);

      onPlaceAdded?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving place:', err);
      setError(err.message || 'Failed to save place');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop-clean z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="modal-clean w-full max-w-lg my-8 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b-2 border-sea-mist">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn-icon"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              {userOdysseyIcon ? (
                <Image
                  src={`/avatars/${userOdysseyIcon.replace('.png', '-circle.png')}`}
                  alt="Your icon"
                  width={64}
                  height={64}
                  className="object-contain w-full h-full"
                />
              ) : (
                <div className="bg-compass-gradient rounded-xl overflow-hidden w-full h-full flex items-center justify-center">
                  <MapPin className="text-white" size={32} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <h2 className="heading-2 mb-2">Add New Place</h2>
            <p className="text-caption">Pin this location to your personal map</p>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Loading State */}
          {loadingPlaceDetails && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="ml-3 text-ocean-grey font-serif italic">Fetching place details...</span>
            </div>
          )}

          {/* Place Photos */}
          {placeDetails?.photos && placeDetails.photos.length > 0 && (
            <div>
              <label className="text-label block mb-2">Google Photos</label>
              <div className="grid grid-cols-3 gap-2">
                {placeDetails.photos.map((photo: string, index: number) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-sea-mist">
                    <img
                      src={photo}
                      alt={`Place photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Level */}
          {priceLevel > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-label">Price Level:</label>
              <div className="flex">
                {[...Array(4)].map((_, i) => (
                  <DollarSign
                    key={i}
                    size={16}
                    className={i < priceLevel ? 'text-primary fill-primary' : 'text-stone-blue'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-label block mb-2">
              Place Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-clean"
              placeholder="e.g., Best coffee in town"
              autoFocus
              disabled={loadingPlaceDetails}
            />
          </div>

          {/* Categories */}
          <div>
            <label className="text-label block mb-2">
              Category *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3 rounded-md border-2 transition-all ${
                      selectedCategory === cat.id
                        ? 'border-primary bg-primary-subtle'
                        : 'border-sea-mist hover:border-stone-blue'
                    }`}
                  >
                    <Icon size={20} className={selectedCategory === cat.id ? 'text-primary mx-auto' : 'text-ocean-grey mx-auto'} />
                    <span className={`text-xs mt-1 block ${
                      selectedCategory === cat.id ? 'text-midnight-blue font-medium' : 'text-ocean-grey'
                    }`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-label block mb-2">
              Notes
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="input-clean resize-none"
              rows={3}
              placeholder="Add any notes about this place..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error animate-slide-up">
              {error}
            </div>
          )}
        </div>

        {/* Footer - Always visible */}
        <div className="flex gap-3 p-6 border-t-2 border-sea-mist bg-cream/60 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex-1 btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Saving...' : 'Save Place'}
          </button>
        </div>
      </div>
    </div>
  );
}