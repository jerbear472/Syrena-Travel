'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Star, Compass, Sparkles, Heart, ArrowRight, Menu, Bookmark, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';

interface Place {
  name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  why: string;
  isFriendPlace?: boolean;
  friend_name?: string;
}

interface JourneyResult {
  vibe_intro: string;
  places: Place[];
}

interface SourceOfJourneyProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNavigateToPlace: (lat: number, lng: number) => void;
}

const SUGGESTED_QUERIES = [
  "I'm exploring Brooklyn this weekend",
  "Show me hidden gems in Silver Lake, LA",
  "I'm in Trastevere, Rome — where should I eat?",
  "Best coffee spots in Shimokitazawa, Tokyo",
  "I'm wandering the Marais in Paris",
  "What's worth seeing in Colonia Roma, Mexico City?",
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

export default function SourceOfJourney({ isSidebarOpen, onToggleSidebar, onNavigateToPlace }: SourceOfJourneyProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JourneyResult | null>(null);
  const [error, setError] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [savingPlace, setSavingPlace] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    // Focus input on mount with slight delay for animation
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, []);

  const fetchFriendsPlacesNearArea = async (searchQuery: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get accepted friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships || friendships.length === 0) return [];

      const friendIds = friendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Get all friends' places with profile info
      const { data: places } = await supabase
        .from('places')
        .select('*, profile:profiles!places_user_id_fkey(display_name, username)')
        .in('user_id', friendIds);

      if (!places) return [];

      // Return all friends' places — the AI will decide relevance
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

    try {
      // Fetch friends' places in parallel
      const friendPlaces = await fetchFriendsPlacesNearArea(q);

      const response = await fetch('/api/source-of-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, friendPlaces }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get recommendations');
      }

      const data = await response.json();
      setResult(data);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlace = async (place: Place) => {
    try {
      setSavingPlace(place.name);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: insertError } = await supabase
        .from('places')
        .insert({
          name: place.name,
          description: place.description,
          category: place.category,
          lat: place.lat,
          lng: place.lng,
          user_id: user.id,
          visit_count: 0,
        });

      if (insertError) throw insertError;

      setSavedPlaces(prev => new Set([...prev, place.name]));
    } catch (err) {
      console.error('Error saving place:', err);
    } finally {
      setSavingPlace(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

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
              <Sparkles className="text-siren-gold" size={18} />
              <span className="text-xs font-sans font-semibold text-midnight-blue tracking-wide uppercase">AI Curated</span>
            </div>
            <div className="h-4 w-px bg-sea-mist hidden sm:block" />
            <span className="text-xs text-ocean-grey italic hidden sm:inline">Powered by Syrena Intelligence</span>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-4 mb-1">
            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-gradient-to-br from-midnight-blue to-ocean-depth items-center justify-center shadow-rustic-md">
              <Image
                src="/SyrenaStar.png"
                alt="Source"
                width={28}
                height={28}
                className="opacity-90"
              />
            </div>
            <div>
              <h1 className="heading-2 flex items-center gap-2">
                Source of Journey
              </h1>
              <p className="text-caption mt-0.5">Tell me where you are. I'll show you where to go.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Search Input */}
          <div className="relative mb-8 animate-tab-enter">
            <div className="relative">
              <Compass className="absolute left-4 top-1/2 -translate-y-1/2 text-ocean-grey" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="I'm in Williamsburg, Brooklyn..."
                className="input-clean pl-12 pr-14 py-4 text-lg"
                disabled={loading}
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon bg-midnight-blue text-cream hover:bg-deep-teal border-deep-teal disabled:opacity-30"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* Suggestions — show when no results */}
          {!result && !loading && (
            <div className="animate-tab-enter" style={{ animationDelay: '0.1s' }}>
              <p className="text-label mb-4 text-ocean-grey">Try something like</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
                {SUGGESTED_QUERIES.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left p-4 rounded-lg border-2 border-sea-mist bg-off-white hover:border-driftwood hover:bg-sea-mist/30 group"
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-ocean-grey mt-0.5 flex-shrink-0 group-hover:text-deep-teal" style={{ transition: 'color 0.3s ease' }} />
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-midnight-blue to-ocean-depth flex items-center justify-center shadow-rustic-lg">
                  <Image
                    src="/SyrenaStar.png"
                    alt="Searching"
                    width={32}
                    height={32}
                    className="animate-gentle-pulse"
                  />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-siren-gold/30 animate-[spin_3s_linear_infinite]" />
              </div>
              <p className="text-ocean-grey font-serif italic text-center">
                Charting your course...
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
                <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-off-white to-sea-mist/50 border-2 border-sea-mist">
                  <p className="font-serif text-lg text-ocean-depth leading-relaxed italic">
                    "{result.vibe_intro}"
                  </p>
                </div>
              )}

              {/* Places Grid */}
              <div className="space-y-4 stagger-children">
                {result.places.map((place, index) => (
                  <div
                    key={`${place.name}-${index}`}
                    className="group card-minimal p-0 overflow-hidden"
                  >
                    <div className="p-5">
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0 mt-0.5" role="img" aria-label={place.category}>
                            {getCategoryIcon(place.category)}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-serif font-semibold text-ocean-depth text-lg leading-tight">
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
                            className="btn-icon text-deep-teal hover:text-midnight-blue"
                            title="View on map"
                          >
                            <Compass size={18} />
                          </button>
                          {savedPlaces.has(place.name) ? (
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
                        <p className="text-xs font-sans text-deep-teal leading-relaxed">
                          <span className="font-semibold text-midnight-blue">Why Syrena picked this:</span> {place.why}
                        </p>
                      </div>

                      {/* Friend Badge */}
                      {place.isFriendPlace && place.friend_name && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="px-3 py-1 rounded-full bg-aqua-mist/20 border border-aqua-mist/40 text-xs font-sans text-deep-teal">
                            <Star size={10} className="inline mr-1 text-siren-gold" />
                            Also saved by {place.friend_name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Search Again */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setResult(null);
                    setQuery('');
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
    </div>
  );
}
