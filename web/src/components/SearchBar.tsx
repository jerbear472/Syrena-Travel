'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Plus } from 'lucide-react';

interface SearchBarProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  onAddCoordinates: () => void;
  isLoaded: boolean;
}

export default function SearchBar({ onPlaceSelect, onAddCoordinates, isLoaded }: SearchBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize Google Places Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['name', 'geometry', 'place_id', 'formatted_address', 'types', 'rating', 'price_level', 'photos']
    });

    // Listen for place selection
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place && place.geometry && place.geometry.location) {
        onPlaceSelect(place);
        setSearchValue('');
      }
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, onPlaceSelect]);

  return (
    <div className="relative w-full sm:w-auto flex gap-2">
      {/* Search Input */}
      <div className="relative flex-1 sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-terracotta pointer-events-none" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search places..."
          className="input-clean pl-10 pr-4 w-full"
        />
      </div>

      {/* Add Button with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="btn-icon bg-earth-brown text-cream hover:bg-rust border-2 border-rust h-full"
          aria-label="Add place"
        >
          <Plus size={18} />
        </button>

        {/* Dropdown Menu */}
        {showAddMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowAddMenu(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 mt-2 w-56 bg-off-white rounded-lg shadow-rustic-lg border-2 border-sand py-2 z-20 animate-slide-up">
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  // This will be handled by map click
                }}
                className="w-full px-4 py-3 text-left hover:bg-sand transition-colors flex items-center gap-3"
              >
                <MapPin size={18} className="text-rust" />
                <div>
                  <div className="text-sm font-serif font-semibold text-earth-brown">Click on Map</div>
                  <div className="text-xs text-terracotta italic">Add from Google location</div>
                </div>
              </button>

              <div className="border-t border-sand my-1" />

              <button
                onClick={() => {
                  setShowAddMenu(false);
                  onAddCoordinates();
                }}
                className="w-full px-4 py-3 text-left hover:bg-sand transition-colors flex items-center gap-3"
              >
                <MapPin size={18} className="text-rust" />
                <div>
                  <div className="text-sm font-serif font-semibold text-earth-brown">Add Coordinates</div>
                  <div className="text-xs text-terracotta italic">Enter lat/lng manually</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}