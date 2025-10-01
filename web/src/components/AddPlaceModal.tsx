'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Coffee, Utensils, Camera, Mountain, ShoppingBag, Hotel, Heart, Building2, Gem, Users, MoreHorizontal, Loader2, DollarSign } from 'lucide-react';
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
  { id: 'restaurant', name: 'Restaurant', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'cafe', name: 'Café', icon: Coffee, color: 'bg-amber-100 text-amber-600' },
  { id: 'viewpoint', name: 'Viewpoint', icon: Camera, color: 'bg-blue-100 text-blue-600' },
  { id: 'nature', name: 'Nature', icon: Mountain, color: 'bg-green-100 text-green-600' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'bg-purple-100 text-purple-600' },
  { id: 'hotel', name: 'Hotel', icon: Hotel, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'museum', name: 'Museum', icon: Building2, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'hidden-gem', name: 'Hidden Gem', icon: Gem, color: 'bg-pink-100 text-pink-600' },
  { id: 'people-watching', name: 'People Watching', icon: Users, color: 'bg-teal-100 text-teal-600' },
  { id: 'other', name: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [priceLevel, setPriceLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

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
        if (types.includes('restaurant') || types.includes('food')) {
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

      console.log('Saving place:', { title, category: selectedCategory, lat: latitude, lng: longitude });

      const placeData = {
        name: title,
        description: comment,
        category: selectedCategory,
        lat: latitude,
        lng: longitude,
        created_by: user.id,
        visit_count: 0
      };

      console.log('Inserting place data:', placeData);

      const { data: insertedData, error: insertError } = await supabase
        .from('places')
        .insert(placeData)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        console.error('Insert error message:', insertError.message);
        console.error('Insert error code:', insertError.code);
        throw insertError;
      }

      console.log('Inserted data:', insertedData);

      console.log('Place saved successfully!');

      // Reset form
      setTitle('');
      setComment('');
      setSelectedCategory('');
      setIsFavorite(false);
      setPriceLevel(0);

      // Notify parent
      if (onPlaceAdded) {
        console.log('Calling onPlaceAdded callback...');
        onPlaceAdded();
      }
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
    <div className="fixed inset-0 modal-backdrop-clean z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="modal-clean w-full max-w-lg my-8 animate-scale-in max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn-icon"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-cream rounded-xl border-2 border-warm-stone overflow-hidden">
              <Image
                src="/bluelyre.png"
                alt="Syrena"
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
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
              <Loader2 className="w-8 h-8 text-rust animate-spin" />
              <span className="ml-3 text-terracotta font-serif">Fetching place details...</span>
            </div>
          )}

          {/* Place Photos */}
          {placeDetails?.photos && placeDetails.photos.length > 0 && (
            <div>
              <label className="text-label block mb-2">Google Photos</label>
              <div className="grid grid-cols-3 gap-2">
                {placeDetails.photos.map((photo: string, index: number) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-sand">
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
            <div className="flex items-center gap-2 text-terracotta">
              <label className="text-label">Price Level:</label>
              <div className="flex">
                {[...Array(4)].map((_, i) => (
                  <DollarSign
                    key={i}
                    size={16}
                    className={i < priceLevel ? 'text-rust fill-rust' : 'text-warm-stone'}
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
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={20} className={selectedCategory === cat.id ? 'text-black mx-auto' : 'text-gray-500 mx-auto'} />
                    <span className={`text-xs mt-1 block ${
                      selectedCategory === cat.id ? 'text-gray-900 font-medium' : 'text-gray-600'
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
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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