'use client';

import { useState } from 'react';
import { X, MapPin, Navigation } from 'lucide-react';

interface AddByCoordinatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (lat: number, lng: number) => void;
}

export default function AddByCoordinatesModal({ isOpen, onClose, onSubmit }: AddByCoordinatesModalProps) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  const handleSubmit = () => {
    setError('');

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid numbers');
      return;
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
      return;
    }

    onSubmit(lat, lng);
    setLatitude('');
    setLongitude('');
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError('Could not get your location');
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop-clean z-50 flex items-center justify-center p-4">
      <div className="modal-clean w-full max-w-md">
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
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-compass-gradient rounded-xl overflow-hidden">
              <Navigation className="text-white" size={32} strokeWidth={1.5} />
            </div>
            <h2 className="heading-2 mb-2">Add by Coordinates</h2>
            <p className="text-caption">Enter latitude and longitude</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Get Current Location Button */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={locating}
            className="w-full btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {locating ? (
              <div className="spinner-minimal" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              <Navigation size={18} />
            )}
            <span>{locating ? 'Locating…' : 'Use Current Location'}</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-sea-mist" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-off-white px-3 text-ocean-grey uppercase tracking-wider font-sans font-semibold">Or enter manually</span>
            </div>
          </div>

          {/* Latitude */}
          <div>
            <label className="text-label block mb-2">
              Latitude *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" size={16} />
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="input-clean pl-10"
                placeholder="e.g., 37.7749"
                autoFocus
              />
            </div>
            <p className="text-xs text-driftwood mt-1 italic">Between -90 and 90</p>
          </div>

          {/* Longitude */}
          <div>
            <label className="text-label block mb-2">
              Longitude *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" size={16} />
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="input-clean pl-10"
                placeholder="e.g., -122.4194"
              />
            </div>
            <p className="text-xs text-driftwood mt-1 italic">Between -180 and 180</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error animate-slide-up">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t-2 border-sea-mist bg-cream/60">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 btn-primary"
          >
            Add Location
          </button>
        </div>
      </div>
    </div>
  );
}