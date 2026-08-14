'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send, MapPin, Star, Compass, Heart, Menu, ExternalLink,
  Bookmark, History, X, Utensils, Coffee, Wine, ShoppingBag,
  Building2, LayoutGrid, Route,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import { photoSrc } from '@/lib/photo';
import AddToTripModal, { AddablePlace } from '@/components/AddToTripModal';

interface Place {
  name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  why: string;
  isUserPlace?: boolean;
  isFriendPlace?: boolean;
  friend_name?: string;
  photo_url?: string | null;
  google_place_id?: string | null;
  rating?: number | null;
  user_ratings_total?: number | null;
  price_level?: number | null;
}

interface JourneyResult {
  vibe_intro: string;
  places: Place[];
}

interface GuideProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNavigateToPlace: (lat: number, lng: number) => void;
}

const SEARCH_HISTORY_KEY = 'pc_guide_search_history';

const SUGGESTED_QUERIES = [
  "I'm exploring Brooklyn this weekend",
  "Hidden gems in Silver Lake, LA",
  "I'm in Trastevere, Rome — where should I eat?",
  "Coffee spots in Shimokitazawa, Tokyo",
  "Wandering the Marais in Paris",
  "Colonia Roma, Mexico City",
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'restaurant', label: 'Food', icon: Utensils },
  { id: 'cafe', label: 'Coffee', icon: Coffee },
  { id: 'bar', label: 'Drinks', icon: Wine },
  { id: 'shopping', label: 'Shop', icon: ShoppingBag },
  { id: 'museum', label: 'Culture', icon: Building2 },
];

const LOADING_STAGES = [
  'Reading the vibe of your ask…',
  'Scouting the neighborhood…',
  'Checking every place on Google Maps…',
  'Pulling photos and ratings…',
  'Keeping only the keepers…',
];

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    restaurant: '🍽',
    cafe: '☕',
    bar: '🍷',
    hotel: '🏨',
    viewpoint: '📸',
    nature: '🌿',
    shopping: '🛍',
    museum: '🏛',
    'hidden-gem': '💎',
  };
  return icons[category] || '📍';
};

// 1234 → "1.2k" for compact review counts on rating pills
const formatReviews = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`;

export default function Guide({ isSidebarOpen, onToggleSidebar, onNavigateToPlace }: GuideProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState<JourneyResult | null>(null);
  const [error, setError] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [savingPlace, setSavingPlace] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tripPlace, setTripPlace] = useState<AddablePlace | null>(null);
  const [addedToTrip, setAddedToTrip] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch { /* history is a nice-to-have */ }
    // Location makes "near me" queries work; fail silently if denied
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000, maximumAge: 300000 }
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) { setLoadingStage(0); return; }
    const ticker = setInterval(() => {
      setLoadingStage(s => Math.min(s + 1, LOADING_STAGES.length - 1));
    }, 4000);
    return () => clearInterval(ticker);
  }, [loading]);

  const pushHistory = (q: string) => {
    const next = [q, ...searchHistory.filter(h => h !== q)].slice(0, 6);
    setSearchHistory(next);
    try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const fetchMyPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: places } = await supabase
        .from('places')
        .select('name, description, category, lat, lng')
        .eq('user_id', user.id)
        .limit(100);
      return places || [];
    } catch {
      return [];
    }
  };

  const fetchFriendsPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships || friendships.length === 0) return [];

      const friendIds = friendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const { data: places } = await supabase
        .from('places')
        .select('*, profile:profiles!places_user_id_fkey(display_name, username)')
        .in('user_id', friendIds);

      if (!places) return [];

      return places.map((p: any) => ({
        name: p.name,
        description: p.description,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        friend_name: p.profile?.display_name || p.profile?.username || 'A friend',
      }));
    } catch (err) {
      console.error('Error fetching friends places:', err);
      return [];
    }
  };

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSelectedFilter('all');

    try {
      const [userPlaces, friendPlaces] = await Promise.all([
        fetchMyPlaces(),
        fetchFriendsPlaces(),
      ]);

      const response = await fetch('/api/source-of-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          userPlaces,
          friendPlaces,
          ...(userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : {}),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get recommendations');
      }

      const data = await response.json();
      setResult(data);
      pushHistory(q.trim());

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlace = async (place: Place): Promise<boolean> => {
    try {
      setSavingPlace(place.name);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error: insertError } = await supabase
        .from('places')
        .insert({
          name: place.name,
          description: place.description,
          category: place.category,
          address: place.address || null,
          lat: place.lat,
          lng: place.lng,
          photo_url: place.photo_url || null,
          google_place_id: place.google_place_id || null,
          rating: place.rating ?? null,
          price_level: place.price_level ?? null,
          user_id: user.id,
          visit_count: 0,
        });

      if (insertError) throw insertError;

      setSavedPlaces(prev => new Set([...prev, place.name]));
      return true;
    } catch (err) {
      console.error('Error saving place:', err);
      return false;
    } finally {
      setSavingPlace(null);
    }
  };

  const handleSaveAll = async () => {
    if (!result) return;
    setSavingAll(true);
    for (const place of result.places) {
      if (!place.isUserPlace && !savedPlaces.has(place.name)) {
        await handleSavePlace(place);
      }
    }
    setSavingAll(false);
  };

  const filteredPlaces = result?.places.filter(
    p => selectedFilter === 'all' || p.category === selectedFilter
  ) || [];

  const unsavedCount = result
    ? result.places.filter(p => !p.isUserPlace && !savedPlaces.has(p.name)).length
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-off-white via-cream to-off-white border-b-2 border-sea-mist shadow-rustic-sm">
        <div className="px-6 py-3 border-b border-sea-mist/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button onClick={onToggleSidebar} className="btn-icon mr-1">
                <Menu size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Compass className="text-primary" size={18} />
              <span className="text-xs font-sans font-semibold text-midnight-blue tracking-wide uppercase">Part concierge, part poet</span>
            </div>
            <div className="h-4 w-px bg-sea-mist hidden sm:block" />
            <span className="text-xs text-ocean-grey italic hidden sm:inline">Every pick verified on Google Maps</span>
          </div>
        </div>
        <div className="px-6 py-5">
          <div>
            <h1 className="heading-2 flex items-center gap-2">
              The Guide
            </h1>
            <p className="text-caption mt-0.5">Tell me where you are. I'll show you where to go.</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Search Input */}
          <div className="relative mb-6 animate-tab-enter">
            <div className="relative">
              <Compass className="absolute left-4 top-1/2 -translate-y-1/2 text-ocean-grey" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="I'm in Williamsburg, Brooklyn…"
                className="input-clean pl-12 pr-14 py-4 text-lg"
                disabled={loading}
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon bg-primary text-white hover:bg-primary-dark border-primary-dark disabled:opacity-30"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* Recent searches + suggestions — show when no results */}
          {!result && !loading && (
            <div className="animate-tab-enter" style={{ animationDelay: '0.1s' }}>
              {searchHistory.length > 0 && (
                <div className="mb-6">
                  <p className="text-label mb-3 text-ocean-grey">Recent</p>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((h) => (
                      <button
                        key={h}
                        onClick={() => { setQuery(h); handleSearch(h); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sea-mist bg-off-white text-xs font-sans text-ocean-depth hover:border-primary hover:text-primary transition-colors"
                      >
                        <History size={12} />
                        <span className="max-w-[220px] truncate">{h}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-label mb-4 text-ocean-grey">Try something like</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
                {SUGGESTED_QUERIES.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setQuery(suggestion); handleSearch(suggestion); }}
                    className="text-left p-4 rounded-lg border-2 border-sea-mist bg-off-white hover:border-primary/50 hover:bg-primary-subtle/40 group"
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-ocean-grey mt-0.5 flex-shrink-0 group-hover:text-primary" style={{ transition: 'color 0.3s ease' }} />
                      <span className="text-sm font-serif text-ocean-depth leading-relaxed">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-rustic-lg overflow-hidden">
                  <Image
                    src="/pocket-compass-star.png"
                    alt="Searching"
                    width={64}
                    height={64}
                    className="object-cover w-full h-full animate-gentle-pulse"
                  />
                </div>
                <div className="absolute -inset-1 rounded-full border-2 border-accent/40 animate-[spin_3s_linear_infinite]" style={{ borderTopColor: 'transparent' }} />
              </div>
              <p className="text-ocean-grey font-serif italic text-center">
                {LOADING_STAGES[loadingStage]}
              </p>
              <p className="text-xs text-driftwood mt-2 font-sans">
                Finding places with soul in this area
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="alert alert-error animate-slide-up mb-6">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div ref={resultsRef} className="animate-tab-enter">
              {/* Vibe Intro */}
              {result.vibe_intro && (
                <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-off-white to-accent-subtle/60 border-2 border-sea-mist">
                  <p className="font-serif text-lg text-ocean-depth leading-relaxed italic">
                    "{result.vibe_intro}"
                  </p>
                </div>
              )}

              {/* Category filter + Save all */}
              <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {CATEGORY_FILTERS.map((f) => {
                    const Icon = f.icon;
                    const active = selectedFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFilter(f.id)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 text-xs font-sans font-medium transition-colors ${
                          active
                            ? 'bg-primary text-white border-primary-dark'
                            : 'bg-off-white text-ocean-depth border-sea-mist hover:border-primary/50'
                        }`}
                      >
                        <Icon size={13} />
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                {unsavedCount > 0 && (
                  <button
                    onClick={handleSaveAll}
                    disabled={savingAll}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent-subtle border-2 border-accent/50 text-xs font-sans font-semibold text-accent-dark hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                  >
                    {savingAll ? (
                      <div className="spinner-minimal" style={{ width: 13, height: 13, borderWidth: 2 }} />
                    ) : (
                      <Bookmark size={13} />
                    )}
                    Save all {unsavedCount}
                  </button>
                )}
              </div>

              {/* Places */}
              <div className="space-y-5 stagger-children">
                {filteredPlaces.map((place, index) => (
                  <div
                    key={`${place.name}-${index}`}
                    className="group card-minimal p-0 overflow-hidden"
                  >
                    {/* Hero photo */}
                    {place.photo_url && (
                      <div className="relative w-full h-52 bg-secondary-subtle">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoSrc(place.photo_url)}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {place.rating != null && (
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 shadow-rustic-md text-xs font-sans font-semibold text-midnight-blue">
                            <Star size={12} className="text-siren-gold fill-siren-gold" />
                            {place.rating.toFixed(1)}
                            {place.user_ratings_total != null && (
                              <span className="font-normal text-ocean-grey">· {formatReviews(place.user_ratings_total)}</span>
                            )}
                          </div>
                        )}
                        {place.price_level != null && place.price_level > 0 && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-white/95 shadow-rustic-md text-xs font-sans font-semibold text-ocean-depth">
                            {'$'.repeat(place.price_level)}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-5">
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0 mt-0.5" role="img" aria-label={place.category}>
                            {getCategoryIcon(place.category)}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-serif font-semibold text-midnight-blue text-lg leading-tight">
                              {place.name}
                            </h3>
                            <p className="text-sm text-ocean-grey mt-1 font-serif italic leading-relaxed">
                              {place.description}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => onNavigateToPlace(place.lat, place.lng)}
                            className="btn-icon text-primary hover:text-primary-dark"
                            title="View on map"
                          >
                            <Compass size={18} />
                          </button>
                          <button
                            onClick={() => setTripPlace(place)}
                            className="btn-icon text-ocean-grey hover:text-primary"
                            title="Add to a trip"
                          >
                            <Route size={18} />
                          </button>
                          {place.google_place_id && (
                            <a
                              href={`https://www.google.com/maps/place/?q=place_id:${place.google_place_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-icon text-ocean-grey hover:text-primary"
                              title="Open in Google Maps"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          {place.isUserPlace || savedPlaces.has(place.name) ? (
                            <div className="btn-icon text-siren-gold">
                              <Heart size={18} className="fill-current" />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSavePlace(place)}
                              disabled={savingPlace === place.name}
                              className="btn-icon text-ocean-grey hover:text-siren-gold"
                              title="Save to My Places"
                            >
                              {savingPlace === place.name ? (
                                <div className="spinner-minimal" style={{ width: 16, height: 16, borderWidth: 2 }} />
                              ) : (
                                <Heart size={18} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-center gap-2 text-xs text-driftwood mb-3">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate font-sans">{place.address}</span>
                      </div>

                      {/* Why Card */}
                      <div className="p-3 rounded-lg bg-cream/80 border border-sea-mist/60">
                        <p className="text-xs font-sans text-ocean-depth leading-relaxed">
                          <span className="font-semibold text-primary">Why the Guide picked this:</span> {place.why}
                        </p>
                      </div>

                      {/* Badges */}
                      {place.isUserPlace && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="px-3 py-1 rounded-full bg-accent-subtle border border-accent/40 text-xs font-sans text-accent-dark">
                            <Heart size={10} className="inline mr-1 fill-current" />
                            Already in your places
                          </div>
                        </div>
                      )}
                      {place.isFriendPlace && place.friend_name && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="px-3 py-1 rounded-full bg-primary-subtle border border-primary/30 text-xs font-sans text-primary-dark">
                            <Star size={10} className="inline mr-1 text-siren-gold" />
                            Also saved by {place.friend_name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredPlaces.length === 0 && (
                  <p className="text-center text-caption py-10">
                    Nothing in this category — try another filter.
                  </p>
                )}
              </div>

              {/* Search Again */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setResult(null);
                    setQuery('');
                    setError('');
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <Compass size={16} />
                  <span>Explore another area</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add-to-trip flow */}
      <AddToTripModal
        place={tripPlace}
        onClose={() => setTripPlace(null)}
        onAdded={(tripTitle, dayNumber) => {
          setAddedToTrip(`Added to ${tripTitle}, Day ${dayNumber}`);
          setTimeout(() => setAddedToTrip(''), 3000);
        }}
      />
      {addedToTrip && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[210] px-4 py-2.5 rounded-full bg-midnight-blue text-white text-sm font-sans shadow-rustic-xl animate-slide-up flex items-center gap-2">
          <Route size={14} className="text-accent" />
          {addedToTrip}
        </div>
      )}
    </div>
  );
}
