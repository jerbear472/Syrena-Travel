'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, MapPin, Star, Compass, Heart, Menu, ExternalLink,
  Bookmark, X, Route, Sparkles, RotateCcw, Map,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import { photoSrc } from '@/lib/photo';
import { categoryMeta } from '@/lib/categories';
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

interface ItineraryDraft {
  title: string;
  destination: string;
  num_days: number;
  prompt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  places?: Place[];
  itineraryDraft?: ItineraryDraft | null;
  chartedTripTitle?: string;
}

interface GuideProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNavigateToPlace: (lat: number, lng: number) => void;
  onRequestSignIn?: () => void;
  onNavigateToTrips?: () => void;
}

const CHAT_STORAGE_KEY = 'pc_guide_chat_v1';
const MAX_STORED_MESSAGES = 40;
// Turns sent to the model per request; the server also enforces its own cap.
const MAX_CONTEXT_TURNS = 16;

const CONVERSATION_STARTERS = [
  "I'm exploring Brooklyn this weekend",
  "Thinking about a week in Lisbon — where do I even start?",
  "I'm in Trastevere, Rome — where should I eat?",
  "Help me plan three days in Mexico City",
  "Coffee spots in Shimokitazawa, Tokyo",
  "What's the best time of year for Kyoto?",
];

const THINKING_LINES = [
  'Reading the vibe of your ask…',
  'Scouting the neighborhood…',
  'Checking every place on Google Maps…',
  'Pulling photos and ratings…',
  'Keeping only the keepers…',
];

const CHARTING_LINES = [
  'Reading our whole conversation…',
  'Clustering days so you never backtrack…',
  'Checking every place on Google Maps…',
  'Inking the route…',
];

// 1234 → "1.2k" for compact review counts on rating pills
const formatReviews = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`;

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

export default function Guide({
  isSidebarOpen, onToggleSidebar, onNavigateToPlace, onRequestSignIn, onNavigateToTrips,
}: GuideProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingLine, setThinkingLine] = useState(0);
  const [error, setError] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [savingPlace, setSavingPlace] = useState<string | null>(null);
  const [savingAllFor, setSavingAllFor] = useState<string | null>(null);
  const [chartingId, setChartingId] = useState<string | null>(null);
  const [chartingLine, setChartingLine] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tripPlace, setTripPlace] = useState<AddablePlace | null>(null);
  const [addedToTrip, setAddedToTrip] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  const supabase = createClient();

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) setMessages(JSON.parse(stored));
    } catch { /* a lost thread is a nice-to-have */ }
    hydratedRef.current = true;
    // Location makes "near me" conversations work; fail silently if denied
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000, maximumAge: 300000 }
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (!loading) { setThinkingLine(0); return; }
    const ticker = setInterval(() => {
      setThinkingLine(s => Math.min(s + 1, THINKING_LINES.length - 1));
    }, 4000);
    return () => clearInterval(ticker);
  }, [loading]);

  useEffect(() => {
    if (!chartingId) { setChartingLine(0); return; }
    const ticker = setInterval(() => {
      setChartingLine(s => Math.min(s + 1, CHARTING_LINES.length - 1));
    }, 6000);
    return () => clearInterval(ticker);
  }, [chartingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const fetchMyPlaces = useCallback(async () => {
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
  }, [supabase]);

  const fetchFriendsPlaces = useCallback(async () => {
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
  }, [supabase]);

  // The model sees plain text turns; place recommendations ride along as a
  // bracketed footnote so it never re-suggests them.
  const serializeForApi = (msgs: ChatMessage[]) =>
    msgs.slice(-MAX_CONTEXT_TURNS).map(m => ({
      role: m.role,
      content:
        m.role === 'assistant' && m.places && m.places.length > 0
          ? `${m.content}\n[You recommended: ${m.places.map(p => p.name).join(', ')}]`
          : m.content,
    }));

  const sendMessage = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: q };
    const thread = [...messages, userMsg];
    setMessages(thread);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const [userPlaces, friendPlaces] = await Promise.all([
        fetchMyPlaces(),
        fetchFriendsPlaces(),
      ]);

      const response = await fetch('/api/guide/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: serializeForApi(thread),
          userPlaces,
          friendPlaces,
          ...(userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : {}),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'The Guide lost its train of thought');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: data.reply,
        places: data.places?.length ? data.places : undefined,
        itineraryDraft: data.itinerary_draft || undefined,
      }]);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setError('');
    try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleChartTrip = async (msg: ChatMessage) => {
    const draft = msg.itineraryDraft;
    if (!draft || chartingId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (onRequestSignIn) onRequestSignIn();
      else setError('Sign in to chart trips.');
      return;
    }

    setChartingId(msg.id);
    setError('');
    try {
      const response = await fetch('/api/itinerary/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: draft.prompt,
          destination: draft.destination,
          numDays: draft.num_days,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Charting failed');

      const tripTitle = data.title || draft.title;
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, chartedTripTitle: tripTitle } : m
      ));
    } catch (err: any) {
      setError(err.message || 'Charting failed. Please try again.');
    } finally {
      setChartingId(null);
    }
  };

  const handleSavePlace = async (place: Place): Promise<boolean> => {
    try {
      setSavingPlace(place.name);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onRequestSignIn?.();
        return false;
      }

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

  const handleSaveAll = async (msg: ChatMessage) => {
    if (!msg.places) return;
    setSavingAllFor(msg.id);
    for (const place of msg.places) {
      if (!place.isUserPlace && !savedPlaces.has(place.name)) {
        await handleSavePlace(place);
      }
    }
    setSavingAllFor(null);
  };

  const unsavedCount = (msg: ChatMessage) =>
    msg.places?.filter(p => !p.isUserPlace && !savedPlaces.has(p.name)).length ?? 0;

  const renderPlaceCard = (place: Place, index: number) => (
    <div
      key={`${place.name}-${index}`}
      className="group card-minimal p-0 overflow-hidden"
    >
      {/* Hero photo */}
      {place.photo_url && (
        <div className="relative w-full h-44 bg-secondary-subtle">
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
            {(() => {
              const m = categoryMeta(place.category);
              const CatIcon = m.Icon;
              return (
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: m.subtle }}
                  aria-label={place.category}
                >
                  <CatIcon size={16} style={{ color: m.color }} />
                </span>
              );
            })()}
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
  );

  const renderItineraryDraft = (msg: ChatMessage) => {
    const draft = msg.itineraryDraft!;
    const isCharting = chartingId === msg.id;
    return (
      <div className="mt-4 p-5 rounded-xl bg-gradient-to-br from-primary-subtle/60 to-accent-subtle/50 border-2 border-primary/30">
        <div className="flex items-center gap-2 mb-2">
          <Map size={16} className="text-primary" />
          <span className="text-xs font-sans font-semibold uppercase tracking-wide text-primary">
            {msg.chartedTripTitle ? 'Trip charted' : 'Ready to chart'}
          </span>
        </div>
        <h3 className="font-serif font-semibold text-midnight-blue text-lg leading-tight">
          {draft.title}
        </h3>
        <p className="text-sm text-ocean-grey font-sans mt-1">
          {draft.destination} · {draft.num_days} day{draft.num_days !== 1 ? 's' : ''}
        </p>
        {msg.chartedTripTitle ? (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <p className="text-sm font-serif italic text-ocean-depth">
              "{msg.chartedTripTitle}" is inked and waiting in your Trips.
            </p>
            {onNavigateToTrips && (
              <button
                onClick={onNavigateToTrips}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <Route size={15} />
                View in Trips
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <button
              onClick={() => handleChartTrip(msg)}
              disabled={isCharting || !!chartingId}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            >
              {isCharting ? (
                <>
                  <div className="spinner-minimal" style={{ width: 15, height: 15, borderWidth: 2 }} />
                  <span>{CHARTING_LINES[chartingLine]}</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Chart this trip</span>
                </>
              )}
            </button>
            {isCharting && (
              <p className="text-xs text-driftwood mt-2 font-sans">
                This takes a little while — every stop gets verified on Google Maps.
              </p>
            )}
          </div>
        )}
      </div>
    );
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
              <Compass className="text-primary" size={18} />
              <span className="text-xs font-sans font-semibold text-midnight-blue tracking-wide uppercase">Part concierge, part poet</span>
            </div>
            <div className="h-4 w-px bg-sea-mist hidden sm:block" />
            <span className="text-xs text-ocean-grey italic hidden sm:inline">Every pick verified on Google Maps</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sea-mist bg-off-white text-xs font-sans text-ocean-depth hover:border-primary hover:text-primary transition-colors"
              title="Start a new conversation"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">New conversation</span>
            </button>
          )}
        </div>
        <div className="px-6 py-5">
          <div>
            <h1 className="heading-2 flex items-center gap-2">
              The Guide
            </h1>
            <p className="text-caption mt-0.5">Talk to me about anywhere. We'll turn it into a trip.</p>
          </div>
        </div>
      </header>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Empty state — conversation starters */}
          {messages.length === 0 && !loading && (
            <div className="animate-tab-enter">
              <p className="text-label mb-4 text-ocean-grey">Start anywhere</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
                {CONVERSATION_STARTERS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
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

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end animate-slide-up">
                  <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md bg-primary text-white shadow-rustic-md">
                    <p className="text-sm font-sans leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="animate-slide-up">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-1 shadow-rustic-sm">
                      <Image
                        src="/pocket-compass-star.png"
                        alt="The Guide"
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="p-5 rounded-2xl rounded-tl-md bg-gradient-to-br from-off-white to-accent-subtle/60 border-2 border-sea-mist">
                        <p className="font-serif text-[15px] text-ocean-depth leading-relaxed whitespace-pre-line">
                          {msg.content}
                        </p>
                      </div>

                      {/* Inline place cards */}
                      {msg.places && msg.places.length > 0 && (
                        <div className="mt-4">
                          {unsavedCount(msg) > 0 && (
                            <div className="flex justify-end mb-3">
                              <button
                                onClick={() => handleSaveAll(msg)}
                                disabled={savingAllFor === msg.id}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent-subtle border-2 border-accent/50 text-xs font-sans font-semibold text-accent-dark hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                              >
                                {savingAllFor === msg.id ? (
                                  <div className="spinner-minimal" style={{ width: 13, height: 13, borderWidth: 2 }} />
                                ) : (
                                  <Bookmark size={13} />
                                )}
                                Save all {unsavedCount(msg)}
                              </button>
                            </div>
                          )}
                          <div className="space-y-4 stagger-children">
                            {msg.places.map((place, i) => renderPlaceCard(place, i))}
                          </div>
                        </div>
                      )}

                      {/* Itinerary draft card */}
                      {msg.itineraryDraft && renderItineraryDraft(msg)}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Thinking indicator */}
            {loading && (
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-1 shadow-rustic-sm">
                  <Image
                    src="/pocket-compass-star.png"
                    alt="Thinking"
                    width={32}
                    height={32}
                    className="object-cover w-full h-full animate-gentle-pulse"
                  />
                </div>
                <div className="px-5 py-4 rounded-2xl rounded-tl-md bg-off-white border-2 border-sea-mist">
                  <p className="text-sm text-ocean-grey font-serif italic">
                    {THINKING_LINES[thinkingLine]}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error animate-slide-up mt-6 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button onClick={() => setError('')} className="btn-icon flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t-2 border-sea-mist bg-gradient-to-r from-off-white via-cream to-off-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="relative">
            <Compass className="absolute left-4 top-1/2 -translate-y-1/2 text-ocean-grey" size={20} />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={messages.length === 0 ? "I'm in Williamsburg, Brooklyn…" : 'Keep the conversation going…'}
              className="input-clean pl-12 pr-14 py-4 text-base"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon bg-primary text-white hover:bg-primary-dark border-primary-dark disabled:opacity-30"
            >
              <Send size={18} />
            </button>
          </div>
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
