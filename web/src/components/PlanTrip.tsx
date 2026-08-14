'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu, Compass, Minus, Plus, ArrowLeft, Share2, Bookmark, Star,
  MapPin, Check, Trash2, ExternalLink, Utensils, Coffee, Wine,
  Building2, Trees, ShoppingBag, Landmark, Moon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import { dayColor } from '@/lib/itinerary-colors';
import { photoSrc } from '@/lib/photo';

interface ItineraryPlace {
  name: string;
  description?: string;
  category?: string;
  address?: string;
  lat?: number;
  lng?: number;
  why?: string;
  google_place_id?: string;
  photo_url?: string;
  rating?: number;
  price_level?: number;
  neighborhood?: string;
}

interface ItineraryDay {
  day_number: number;
  narrative: string;
  places: ItineraryPlace[];
}

interface Itinerary {
  id: string;
  title: string;
  destination: string;
  num_days: number;
  shareable_token?: string;
  created_at?: string;
  days: ItineraryDay[];
}

interface SavedTrip {
  id: string;
  title: string;
  destination: string;
  num_days: number;
  created_at: string;
}

interface PlanTripProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isAuthenticated: boolean;
  onRequestSignIn: () => void;
}

const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'standard', label: 'Balanced' },
  { value: 'packed', label: 'Packed' },
] as const;

type Pace = (typeof PACE_OPTIONS)[number]['value'];

const PREFERENCE_OPTIONS = [
  { label: 'Food', icon: Utensils },
  { label: 'Coffee', icon: Coffee },
  { label: 'Bars', icon: Wine },
  { label: 'Museums', icon: Building2 },
  { label: 'Nature', icon: Trees },
  { label: 'Shopping', icon: ShoppingBag },
  { label: 'Architecture', icon: Landmark },
  { label: 'Nightlife', icon: Moon },
];

// Staged progress for the generation loader. Generation runs ~20-50s
// (LLM + Google verification), so stages tick every 5s and the bar parks
// at 92% until the response actually lands.
const CHARTING_STAGES = [
  { progress: 8, message: 'Reading your trip notes…' },
  { progress: 22, message: 'Scouting neighborhoods…' },
  { progress: 38, message: 'Picking the keepers…' },
  { progress: 52, message: 'Clustering days so you never backtrack…' },
  { progress: 68, message: 'Checking every place on Google Maps…' },
  { progress: 82, message: 'Pulling photos and ratings…' },
  { progress: 92, message: 'Inking the route…' },
];

export default function PlanTrip({ isSidebarOpen, onToggleSidebar, isAuthenticated, onRequestSignIn }: PlanTripProps) {
  // Form state
  const [destination, setDestination] = useState('');
  const [numDays, setNumDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [pace, setPace] = useState<Pace>('standard');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [avoids, setAvoids] = useState('');

  // Result state
  const [loading, setLoading] = useState(false);
  const [chartStage, setChartStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savedAllDone, setSavedAllDone] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Saved trips
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const resultsTopRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, [supabase]);

  const refreshSavedTrips = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('itineraries')
        .select('id, title, destination, num_days, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setSavedTrips(data);
    } catch { /* saved-trips list is non-critical */ }
  }, [supabase]);

  useEffect(() => {
    if (isAuthenticated) refreshSavedTrips();
  }, [isAuthenticated, refreshSavedTrips]);

  // Staged loader ticker
  useEffect(() => {
    if (!loading) { setChartStage(0); return; }
    const ticker = setInterval(() => {
      setChartStage(s => Math.min(s + 1, CHARTING_STAGES.length - 1));
    }, 5000);
    return () => clearInterval(ticker);
  }, [loading]);

  const togglePref = (p: string) => {
    setPreferences(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));
  };

  const bumpDays = (delta: number) => {
    setNumDays(d => Math.min(30, Math.max(1, d + delta)));
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) { onRequestSignIn(); return; }
    if (!destination.trim() && !notes.trim()) {
      setError('Add a destination or describe the trip.');
      return;
    }
    setError(null);
    setLoading(true);
    setSavedAllDone(false);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to plan a trip.');

      const response = await fetch('/api/itinerary/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: notes.trim() || `${numDays} days in ${destination.trim()}`,
          destination: destination.trim() || undefined,
          numDays,
          constraints: {
            pace,
            preferences: preferences.length ? preferences : undefined,
            avoids: avoids.trim()
              ? avoids.split(',').map(s => s.trim()).filter(Boolean)
              : undefined,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      setItinerary(data);
      refreshSavedTrips();
      setTimeout(() => resultsTopRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTrip = async (id: string) => {
    setLoadingTripId(id);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in.');
      const response = await fetch(`/api/itinerary/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not open trip');
      setItinerary(data);
      setSavedAllDone(false);
      setTimeout(() => resultsTopRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open trip');
    } finally {
      setLoadingTripId(null);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    setDeletingTripId(id);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`/api/itinerary/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSavedTrips(prev => prev.filter(t => t.id !== id));
        if (itinerary?.id === id) setItinerary(null);
      }
    } finally {
      setDeletingTripId(null);
    }
  };

  const shareUrl = itinerary?.shareable_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/itinerary/${itinerary.id}?token=${itinerary.shareable_token}`
    : null;

  const handleCopyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const handleSaveAll = async () => {
    if (!itinerary) return;
    setSavingAll(true);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`/api/itinerary/${itinerary.id}/save-all-places`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) setSavedAllDone(true);
    } finally {
      setSavingAll(false);
    }
  };

  const totalPlaces = itinerary
    ? itinerary.days.reduce((n, d) => n + (d.places?.length || 0), 0)
    : 0;

  // -------------------- Loading view --------------------

  if (loading) {
    const stage = CHARTING_STAGES[chartStage];
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in">
        <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-rustic-lg animate-gentle-pulse mb-6 overflow-hidden">
          <Image
            src="/pocket-compass-star.png"
            alt="Charting"
            width={64}
            height={64}
            className="object-cover w-full h-full"
          />
        </div>
        <h2 className="heading-2 mb-4">Charting your course</h2>
        <div className="w-full max-w-xs h-1.5 rounded-full bg-sea-mist overflow-hidden mb-5">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${stage.progress}%`, transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </div>
        <p className="text-ocean-grey font-serif italic text-center max-w-xs">{stage.message}</p>
        <p className="text-xs text-driftwood mt-3 font-sans tracking-wide">
          {numDays}-day trip{destination.trim() ? ` · ${destination.trim()}` : ''}
        </p>
      </div>
    );
  }

  // -------------------- Result view --------------------

  if (itinerary) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div ref={resultsTopRef} />
        {/* Top bar */}
        <header className="bg-gradient-to-r from-off-white via-cream to-off-white border-b-2 border-sea-mist px-4 sm:px-6 py-3 flex items-center gap-3">
          <button onClick={() => setItinerary(null)} className="btn-icon flex-shrink-0" aria-label="Back to planner">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif font-semibold text-lg text-midnight-blue truncate">{itinerary.title}</h1>
            <p className="text-xs text-ocean-grey font-sans">
              {itinerary.num_days} day{itinerary.num_days !== 1 ? 's' : ''} · {totalPlaces} place{totalPlaces !== 1 ? 's' : ''} · {itinerary.destination}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {shareUrl && (
              <>
                <button
                  onClick={handleCopyShare}
                  className="btn-icon text-primary hover:text-primary-dark"
                  title="Copy share link"
                >
                  {shareCopied ? <Check size={18} className="text-success" /> : <Share2 size={18} />}
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-icon text-ocean-grey hover:text-primary hidden sm:inline-flex"
                  title="Open share page"
                >
                  <ExternalLink size={18} />
                </a>
              </>
            )}
            <button
              onClick={handleSaveAll}
              disabled={savingAll || savedAllDone}
              className="btn-primary !min-h-[40px] !py-2 !px-4 text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {savingAll ? (
                <div className="spinner-minimal" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff', borderRightColor: '#fff' }} />
              ) : savedAllDone ? (
                <Check size={15} />
              ) : (
                <Bookmark size={15} />
              )}
              <span className="hidden sm:inline">{savedAllDone ? 'Saved' : `Save all ${totalPlaces}`}</span>
            </button>
          </div>
        </header>

        {/* Day-by-day */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            {/* Day legend */}
            <div className="flex flex-wrap gap-2 mb-8">
              {itinerary.days.map(d => (
                <div
                  key={d.day_number}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-off-white border border-sea-mist text-sm text-ocean-depth font-sans"
                >
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: dayColor(d.day_number) }} />
                  Day {d.day_number}
                </div>
              ))}
            </div>

            <div className="space-y-12">
              {itinerary.days.map(d => (
                <section key={d.day_number} className="animate-slide-up">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-display text-3xl sm:text-4xl font-semibold" style={{ color: dayColor(d.day_number) }}>
                      Day {d.day_number}
                    </span>
                  </div>
                  {d.narrative && (
                    <p className="text-lg leading-relaxed text-ocean-grey font-serif italic mb-6 max-w-3xl">
                      {d.narrative}
                    </p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(d.places || []).map((p, i) => (
                      <article
                        key={`${d.day_number}-${i}-${p.google_place_id || p.name}`}
                        className="rounded-xl overflow-hidden bg-off-white border-2 border-sea-mist shadow-rustic-sm hover:shadow-rustic-lg transition-shadow"
                      >
                        {p.photo_url && (
                          <div className="relative w-full h-44 bg-secondary-subtle">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoSrc(p.photo_url)} alt={p.name || ''} className="w-full h-full object-cover" loading="lazy" />
                            <div
                              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-sans font-medium text-white"
                              style={{ background: dayColor(d.day_number) }}
                            >
                              Day {d.day_number} · #{i + 1}
                            </div>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="font-serif font-semibold text-lg text-midnight-blue leading-tight">
                              {p.name}
                            </h3>
                            {p.rating != null && (
                              <span className="flex items-center gap-1 text-sm text-accent-dark shrink-0 mt-0.5 font-sans">
                                <Star size={13} className="text-siren-gold fill-siren-gold" />
                                {p.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {(p.neighborhood || p.category) && (
                            <div className="text-[11px] tracking-wider uppercase text-driftwood mb-2 font-sans">
                              {[p.category, p.neighborhood].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {p.description && (
                            <p className="text-sm text-ocean-depth leading-relaxed mb-2">{p.description}</p>
                          )}
                          {p.why && (
                            <p className="text-[13px] text-ocean-grey leading-relaxed italic border-l-2 border-accent pl-3">
                              {p.why}
                            </p>
                          )}
                          {p.address && (
                            <div className="flex items-center gap-1.5 text-xs text-driftwood mt-3 font-sans">
                              <MapPin size={11} className="flex-shrink-0" />
                              <span className="truncate">{p.address}</span>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------- Form view --------------------

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-off-white via-cream to-off-white border-b-2 border-sea-mist shadow-rustic-sm">
        <div className="px-6 py-3 border-b border-sea-mist/50 flex items-center gap-3">
          {!isSidebarOpen && (
            <button onClick={onToggleSidebar} className="btn-icon mr-1">
              <Menu size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Compass className="text-primary" size={18} />
            <span className="text-xs font-sans font-semibold text-midnight-blue tracking-wide uppercase">Geographically thoughtful</span>
          </div>
          <div className="h-4 w-px bg-sea-mist hidden sm:block" />
          <span className="text-xs text-ocean-grey italic hidden sm:inline">Days cluster so you never backtrack</span>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shadow-rustic-md overflow-hidden">
              <Image
                src="/pocket-compass-star.png"
                alt="Plan a Trip"
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <h1 className="heading-2">Plan a Trip</h1>
              <p className="text-caption mt-0.5">Tell Pocket Compass where you're going. We'll chart the rest.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Saved trips */}
          {savedTrips.length > 0 && (
            <div className="mb-8 animate-tab-enter">
              <p className="text-label mb-3 text-ocean-grey">Your trips</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {savedTrips.map((trip, i) => (
                  <div
                    key={trip.id}
                    className="relative flex-shrink-0 w-52 p-4 rounded-xl bg-off-white border-2 border-sea-mist hover:border-primary/40 transition-colors group"
                  >
                    <button
                      onClick={() => handleOpenTrip(trip.id)}
                      disabled={loadingTripId === trip.id}
                      className="block w-full text-left"
                    >
                      <span className="block w-6 h-1 rounded-full mb-2" style={{ background: dayColor(i + 1) }} />
                      <span className="block font-serif font-semibold text-midnight-blue leading-snug truncate">
                        {trip.title}
                      </span>
                      <span className="block text-xs text-ocean-grey font-sans mt-1 truncate">
                        {trip.num_days} day{trip.num_days !== 1 ? 's' : ''} · {trip.destination}
                      </span>
                    </button>
                    {loadingTripId === trip.id ? (
                      <div className="absolute top-2.5 right-2.5 spinner-minimal" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    ) : (
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        disabled={deletingTripId === trip.id}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-driftwood opacity-0 group-hover:opacity-100 hover:text-error hover:bg-error-subtle transition-all"
                        title="Delete trip"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Destination */}
          <div className="mb-6 animate-tab-enter">
            <label className="text-label block mb-2">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="Southern France, Lisbon + Porto, Tokyo…"
              className="input-clean"
            />
          </div>

          {/* Days stepper */}
          <div className="mb-6">
            <label className="text-label block mb-2">How many days</label>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-off-white border-1.5 border-2 border-sea-mist">
              <button
                onClick={() => bumpDays(-1)}
                disabled={numDays <= 1}
                className="btn-icon bg-cream border border-sea-mist disabled:opacity-40"
                aria-label="Fewer days"
              >
                <Minus size={18} />
              </button>
              <div className="flex-1 flex items-baseline justify-center gap-2">
                <span className="font-display text-3xl font-semibold text-midnight-blue">{numDays}</span>
                <span className="text-sm text-ocean-grey font-sans">day{numDays !== 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={() => bumpDays(1)}
                disabled={numDays >= 30}
                className="btn-icon bg-cream border border-sea-mist disabled:opacity-40"
                aria-label="More days"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Pace */}
          <div className="mb-6">
            <label className="text-label block mb-2">Pace</label>
            <div className="flex gap-2">
              {PACE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPace(opt.value)}
                  className={`flex-1 py-2.5 rounded-full border-2 text-sm font-sans font-medium transition-colors ${
                    pace === opt.value
                      ? 'bg-primary text-white border-primary-dark'
                      : 'bg-off-white text-ocean-depth border-sea-mist hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="mb-6">
            <label className="text-label block mb-2">Lean toward</label>
            <div className="flex flex-wrap gap-2">
              {PREFERENCE_OPTIONS.map(p => {
                const Icon = p.icon;
                const active = preferences.includes(p.label);
                return (
                  <button
                    key={p.label}
                    onClick={() => togglePref(p.label)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm font-sans font-medium transition-colors ${
                      active
                        ? 'bg-accent text-white border-accent-dark'
                        : 'bg-off-white text-ocean-depth border-sea-mist hover:border-accent/60'
                    }`}
                  >
                    <Icon size={14} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avoids */}
          <div className="mb-6">
            <label className="text-label block mb-2">Skip</label>
            <input
              type="text"
              value={avoids}
              onChange={e => setAvoids(e.target.value)}
              placeholder="Chain restaurants, long lines, late nights…"
              className="input-clean"
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-label block mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Honeymoon, slow mornings, walkable cities, splurges allowed…"
              rows={3}
              className="input-clean resize-y min-h-[80px]"
            />
          </div>

          {error && (
            <div className="alert alert-error animate-slide-up mb-5">{error}</div>
          )}

          <button
            onClick={handleGenerate}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Compass size={18} />
            <span>{isAuthenticated ? 'Chart my trip' : 'Sign in to chart your trip'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
