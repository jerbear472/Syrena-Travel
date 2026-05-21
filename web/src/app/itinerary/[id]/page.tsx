import { notFound } from 'next/navigation';
import { anonClient } from '@/lib/auth-server';
import { dayColor } from '@/lib/itinerary-colors';
import type { Metadata } from 'next';

interface ItineraryPlace {
  name?: string;
  description?: string;
  category?: string;
  address?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  photo_url?: string;
  rating?: number;
  price_level?: number;
  why?: string;
  neighborhood?: string;
}

interface ItineraryDay {
  day_number: number;
  narrative: string;
  places: ItineraryPlace[];
}

interface ItineraryPublic {
  id: string;
  title: string;
  destination: string;
  num_days: number;
  prompt: string;
  constraints: Record<string, unknown>;
  created_at: string;
  days: ItineraryDay[];
}

async function loadItinerary(id: string, token: string): Promise<ItineraryPublic | null> {
  const client = anonClient();
  if (!client) return null;
  const { data, error } = await client.rpc('get_itinerary_by_token', {
    p_itinerary_id: id,
    p_token: token,
  });
  if (error || !data || data.length === 0) return null;
  return data[0] as ItineraryPublic;
}

function buildStaticMapUrl(days: ItineraryDay[]): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const parts: string[] = [
    'https://maps.googleapis.com/maps/api/staticmap?size=1200x600',
    'scale=2',
    'maptype=roadmap',
    'style=feature:poi|visibility:off',
  ];

  days.forEach(d => {
    const color = dayColor(d.day_number).replace('#', '0x');
    const coords = d.places
      .filter(p => p.lat != null && p.lng != null)
      .map(p => `${p.lat},${p.lng}`);

    if (coords.length === 0) return;

    parts.push(
      `markers=color:${color}|label:${d.day_number}|${coords.join('|')}`
    );
    if (coords.length >= 2) {
      parts.push(`path=color:${color}AA|weight:3|${coords.join('|')}`);
    }
  });

  parts.push(`key=${key}`);
  return parts.join('&');
}

export async function generateMetadata(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ token?: string }>;
  }
): Promise<Metadata> {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) return { title: 'Syrena Travel — Itinerary' };
  const itin = await loadItinerary(id, token);
  if (!itin) return { title: 'Syrena Travel — Itinerary' };
  return {
    title: `${itin.title} — Syrena Travel`,
    description: `${itin.num_days}-day trip to ${itin.destination}, planned with Syrena.`,
  };
}

export default async function ItineraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) notFound();
  const itin = await loadItinerary(id, token);
  if (!itin) notFound();

  const mapUrl = buildStaticMapUrl(itin.days);
  const totalPlaces = itin.days.reduce((n, d) => n + (d.places?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-navy-gradient text-text-inverse">
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-12">
          <div className="text-xs tracking-[0.3em] uppercase text-accent-light mb-4">
            Syrena Travel
          </div>
          <h1 className="font-display text-5xl md:text-6xl leading-tight mb-4">
            {itin.title}
          </h1>
          <div className="text-lg md:text-xl text-white/75 font-light">
            {itin.num_days} day{itin.num_days > 1 ? 's' : ''} · {totalPlaces} place{totalPlaces !== 1 ? 's' : ''} · {itin.destination}
          </div>
        </div>
      </header>

      {/* Static map */}
      {mapUrl && (
        <div className="max-w-5xl mx-auto -mt-6 px-6">
          <div className="rounded-2xl overflow-hidden shadow-xl border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapUrl}
              alt="Itinerary map"
              className="w-full h-auto block"
            />
          </div>
        </div>
      )}

      {/* Day legend */}
      <div className="max-w-5xl mx-auto px-6 mt-8">
        <div className="flex flex-wrap gap-2">
          {itin.days.map(d => (
            <div
              key={d.day_number}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-sm text-text-secondary"
            >
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ background: dayColor(d.day_number) }}
              />
              Day {d.day_number}
            </div>
          ))}
        </div>
      </div>

      {/* Day-by-day list */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {itin.days.map(d => (
          <section key={d.day_number} className="animate-slide-up">
            <div className="flex items-baseline gap-3 mb-3">
              <span
                className="font-display text-4xl"
                style={{ color: dayColor(d.day_number) }}
              >
                Day {d.day_number}
              </span>
            </div>
            {d.narrative && (
              <p className="text-lg leading-relaxed text-text-secondary font-serif italic mb-6 max-w-3xl">
                {d.narrative}
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {(d.places || []).map((p, i) => (
                <article
                  key={`${d.day_number}-${i}-${p.google_place_id || p.name}`}
                  className="rounded-xl overflow-hidden bg-surface border border-border shadow-card hover:shadow-lg transition-shadow"
                >
                  {p.photo_url && (
                    <div className="relative w-full h-48 bg-secondary-subtle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.photo_url}
                        alt={p.name || ''}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ background: dayColor(d.day_number) }}
                      >
                        Day {d.day_number} · #{i + 1}
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-display text-2xl text-text-primary leading-tight">
                        {p.name}
                      </h3>
                      {p.rating != null && (
                        <span className="text-sm text-accent shrink-0 mt-1">
                          ★ {p.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {(p.neighborhood || p.category) && (
                      <div className="text-xs tracking-wider uppercase text-text-tertiary mb-3">
                        {[p.category, p.neighborhood].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {p.description && (
                      <p className="text-[15px] text-text-secondary leading-relaxed mb-3">
                        {p.description}
                      </p>
                    )}
                    {p.why && (
                      <p className="text-[14px] text-text-secondary leading-relaxed italic border-l-2 border-accent pl-3">
                        {p.why}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Footer CTA */}
      <footer className="bg-primary-subtle border-t border-border mt-12">
        <div className="max-w-5xl mx-auto px-6 py-10 text-center">
          <div className="font-display text-2xl text-primary mb-2">
            Plan your own trip with Syrena
          </div>
          <p className="text-text-secondary mb-4">
            AI-generated itineraries, hand-picked places, geographically thoughtful.
          </p>
          <a
            href="https://apps.apple.com/app/syrena-travel"
            className="inline-block px-6 py-3 rounded-xl bg-primary text-text-inverse font-medium hover:bg-primary-dark transition-colors"
          >
            Get Syrena Travel
          </a>
        </div>
      </footer>
    </div>
  );
}
