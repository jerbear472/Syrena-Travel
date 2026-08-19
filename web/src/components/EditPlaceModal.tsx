'use client';

import { useState, useEffect } from 'react';
import { X, Coffee, Utensils, Camera, Mountain, ShoppingBag, Hotel, Wine, Building2, Gem, Users, MoreHorizontal, DollarSign, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface EditPlaceModalProps {
  place: any | null;
  onClose: () => void;
  onSaved?: () => void;
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

export default function EditPlaceModal({ place, onClose, onSaved }: EditPlaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priceLevel, setPriceLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (place) {
      setName(place.name || '');
      setDescription(place.description || '');
      setCategory(place.category || '');
      setPriceLevel(place.price_level || 0);
      setError('');
    }
  }, [place]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    if (!category) {
      setError('Please select a category');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('places')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category,
          price_level: priceLevel >= 1 && priceLevel <= 4 ? priceLevel : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', place.id);

      if (updateError) throw updateError;

      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('Error updating place:', err);
      setError(err.message || 'Failed to update place');
    } finally {
      setLoading(false);
    }
  };

  if (!place) return null;

  return (
    <div className="fixed inset-0 modal-backdrop-clean z-[60] flex items-center justify-center p-4 overflow-y-auto">
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
            <div className="w-12 h-12 mx-auto mb-3 bg-compass-gradient rounded-xl flex items-center justify-center">
              <Pencil className="text-white" size={22} strokeWidth={1.5} />
            </div>
            <h2 className="heading-2 mb-1">Edit Place</h2>
            <p className="text-caption">Update the details of your saved place</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="text-label block mb-2">Place Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-clean"
              autoFocus
            />
          </div>

          {/* Categories */}
          <div>
            <label className="text-label block mb-2">Category *</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-md border-2 transition-all ${
                      category === cat.id
                        ? 'border-primary bg-primary-subtle'
                        : 'border-sea-mist hover:border-stone-blue'
                    }`}
                  >
                    <Icon size={20} className={category === cat.id ? 'text-primary mx-auto' : 'text-ocean-grey mx-auto'} />
                    <span className={`text-xs mt-1 block ${
                      category === cat.id ? 'text-midnight-blue font-medium' : 'text-ocean-grey'
                    }`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Level */}
          <div>
            <label className="text-label block mb-2">Price Level</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  onClick={() => setPriceLevel(priceLevel === level ? 0 : level)}
                  className={`px-3 py-2 rounded-md border-2 transition-all flex ${
                    priceLevel >= level ? 'border-primary bg-primary-subtle' : 'border-sea-mist hover:border-stone-blue'
                  }`}
                  aria-label={`Price level ${level}`}
                >
                  <DollarSign size={14} className={priceLevel >= level ? 'text-primary' : 'text-stone-blue'} />
                </button>
              ))}
              {priceLevel > 0 && (
                <button onClick={() => setPriceLevel(0)} className="text-xs text-ocean-grey hover:text-midnight-blue ml-1">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-label block mb-2">Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-clean resize-none"
              rows={3}
              placeholder="Add any notes about this place..."
            />
          </div>

          {error && (
            <div className="alert alert-error animate-slide-up">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t-2 border-sea-mist bg-cream/60 flex-shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex-1 btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
