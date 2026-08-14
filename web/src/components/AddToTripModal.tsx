'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Route, Check, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase';

// A place in the shape itinerary days store (superset-tolerant: extra keys
// from Guide results pass straight through into the day's JSONB).
export interface AddablePlace {
  name: string;
  description?: string | null;
  category?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  why?: string | null;
  photo_url?: string | null;
  google_place_id?: string | null;
  rating?: number | null;
  price_level?: number | null;
  neighborhood?: string | null;
}

interface TripOption {
  id: string;
  title: string;
  destination: string;
  num_days: number;
}

interface AddToTripModalProps {
  place: AddablePlace | null; // null = closed
  onClose: () => void;
  onAdded: (tripTitle: string, dayNumber: number) => void;
}

// Pick a trip + day, then append the place to that day, locked — the user
// chose it, so it's a decided stop that survives any redraw.
export default function AddToTripModal({ place, onClose, onAdded }: AddToTripModalProps) {
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripOption | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);

  const supabase = createClient();

  const loadTrips = useCallback(async () => {
    setLoadingTrips(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setNeedsAuth(true); return; }
      const { data } = await supabase
        .from('itineraries')
        .select('id, title, destination, num_days')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setTrips(data || []);
    } finally {
      setLoadingTrips(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (place) {
      setSelectedTrip(null);
      setNeedsAuth(false);
      loadTrips();
    }
  }, [place, loadTrips]);

  const handleAdd = async (trip: TripOption, dayNumber: number) => {
    if (!place) return;
    setAdding(dayNumber);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Please sign in.');

      // Read the current day, append, write back the full array.
      const getRes = await fetch(`/api/itinerary/${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const itin = await getRes.json();
      if (!getRes.ok) throw new Error(itin.error || 'Could not open trip');

      const day = (itin.days || []).find((d: any) => d.day_number === dayNumber);
      const places: any[] = day?.places ? [...day.places] : [];

      const key = place.google_place_id || place.name.trim().toLowerCase();
      const dupe = (itin.days || []).some((d: any) =>
        (d.places || []).some(
          (p: any) => (p.google_place_id || p.name?.trim().toLowerCase()) === key
        )
      );
      if (dupe) throw new Error('Already in this trip.');

      places.push({ ...place, locked: true });

      const patchRes = await fetch(`/api/itinerary/${trip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ days: [{ day_number: dayNumber, places }] }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json();
        throw new Error(err.error || 'Could not add place');
      }

      onAdded(trip.title, dayNumber);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add place');
    } finally {
      setAdding(null);
    }
  };

  if (!place) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 modal-backdrop-clean" onClick={onClose} />
      <div className="relative modal-clean w-full max-w-sm p-5">
        <button onClick={onClose} className="absolute top-3 right-3 btn-icon" aria-label="Close">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Route className="text-primary" size={18} />
          <h3 className="font-serif font-semibold text-lg text-midnight-blue">Add to trip</h3>
        </div>
        <p className="text-xs text-ocean-grey font-sans mb-4 truncate">
          {place.name}
          <span className="inline-flex items-center gap-1 ml-2 text-accent-dark">
            <Lock size={10} /> added as decided
          </span>
        </p>

        {error && <div className="alert alert-error mb-3 text-sm">{error}</div>}

        {needsAuth ? (
          <p className="text-sm text-ocean-grey font-serif italic py-4 text-center">
            Sign in to add places to a trip.
          </p>
        ) : loadingTrips ? (
          <div className="flex justify-center py-6"><div className="spinner-minimal" /></div>
        ) : trips.length === 0 ? (
          <p className="text-sm text-ocean-grey font-serif italic py-4 text-center">
            No trips yet — chart one in the Trips tab first.
          </p>
        ) : !selectedTrip ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {trips.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTrip(t)}
                className="w-full text-left p-3 rounded-lg border-2 border-sea-mist bg-off-white hover:border-primary/50 transition-colors"
              >
                <span className="block font-serif font-semibold text-midnight-blue truncate">{t.title}</span>
                <span className="block text-xs text-ocean-grey font-sans mt-0.5">
                  {t.num_days} day{t.num_days !== 1 ? 's' : ''} · {t.destination}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedTrip(null)}
              className="text-xs text-ocean-grey font-sans hover:text-primary mb-3"
            >
              ← {selectedTrip.title}
            </button>
            <p className="text-label mb-2">Which day?</p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: selectedTrip.num_days }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => handleAdd(selectedTrip, n)}
                  disabled={adding !== null}
                  className="py-2.5 rounded-lg border-2 border-sea-mist bg-off-white text-sm font-sans font-medium text-ocean-depth hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                >
                  {adding === n ? (
                    <div className="spinner-minimal mx-auto" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    `Day ${n}`
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
