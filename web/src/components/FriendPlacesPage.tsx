'use client';

import { useState, useEffect } from 'react';
import {
  MapPin, ArrowLeft, Grid3x3, List, Search, Trash2, Globe2,
  Utensils, Coffee, Camera, Mountain, ShoppingBag, Hotel,
  Building2, Gem, Users, MoreHorizontal, DollarSign, Zap, Eye
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface FriendPlacesPageProps {
  friend: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  onBack: () => void;
  onNavigateToPlace?: (lat: number, lng: number) => void;
}

export default function FriendPlacesPage({ friend, onBack, onNavigateToPlace }: FriendPlacesPageProps) {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendProfile, setFriendProfile] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    loadFriendPlaces();
  }, [friend]);

  const loadFriendPlaces = async () => {
    setLoading(true);
    try {
      // Load places
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', friend.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading friend places:', error);
      } else {
        setPlaces(data || []);
      }

      // Load friend's profile for XP/Level
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', friend.id)
        .single();

      if (profile) {
        setFriendProfile(profile);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: any = {
      restaurant: Utensils,
      cafe: Coffee,
      coffee: Coffee,
      viewpoint: Camera,
      nature: Mountain,
      shopping: ShoppingBag,
      hotel: Hotel,
      museum: Building2,
      'hidden-gem': Gem,
      'people-watching': Users,
      other: MoreHorizontal,
    };
    return icons[category] || MapPin;
  };

  // Filter places based on search
  const filteredPlaces = places.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique cities/locations
  const getUniqueCities = () => {
    const cities = new Map();
    places.forEach(place => {
      const cityKey = `${Math.round(place.lat * 10) / 10},${Math.round(place.lng * 10) / 10}`;
      cities.set(cityKey, true);
    });
    return cities.size;
  };

  const stats = [
    { label: 'Total Places', value: places.length.toString(), icon: MapPin },
    { label: 'Cities', value: getUniqueCities().toString(), icon: Globe2 },
    { label: 'Level', value: friendProfile?.level?.toString() || '1', icon: Zap, subtext: `${friendProfile?.xp || 0} XP` }
  ];

  return (
    <div className="h-full flex flex-col bg-cream">
      {/* Header */}
      <header className="header-clean border-b-2 border-sand">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="btn-icon"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-midnight-blue rounded-full flex items-center justify-center text-cream font-serif font-semibold text-lg flex-shrink-0 border-2 border-deep-teal overflow-hidden">
              {friend.avatar_url ? (
                <img
                  src={friend.avatar_url}
                  alt={friend.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                friend.display_name?.[0]?.toUpperCase() || friend.username?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <h1 className="heading-2">{friend.display_name || friend.username}'s Places</h1>
              <p className="text-caption">@{friend.username}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="card-minimal p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon
                    size={18}
                    className="text-rust"
                  />
                  <span className="text-2xl font-display font-semibold text-earth-brown">
                    {stat.value}
                  </span>
                </div>
                <p className="text-caption">
                  {stat.label}
                </p>
                {stat.subtext && (
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.subtext}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-terracotta" size={16} />
            <input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-clean pl-10 pr-3"
            />
          </div>

          <div className="flex items-center bg-off-white border-2 border-warm-stone rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-2 transition-all ${
                viewMode === 'grid'
                  ? 'bg-earth-brown text-cream'
                  : 'text-earth-brown hover:bg-sand'
              }`}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-2 transition-all ${
                viewMode === 'list'
                  ? 'bg-earth-brown text-cream'
                  : 'text-earth-brown hover:bg-sand'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 lg:p-8 bg-sand/20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner-minimal mx-auto mb-4"></div>
              <p className="text-terracotta font-serif">Loading places...</p>
            </div>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-sand border-2 border-warm-stone rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin size={32} className="text-rust" />
              </div>
              <h3 className="heading-3 mb-3">
                {searchQuery ? 'No matching places' : 'No places yet'}
              </h3>
              <p className="text-body mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : `${friend.display_name || friend.username} hasn't saved any places yet`
                }
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredPlaces.map((place) => {
              const CategoryIcon = getCategoryIcon(place.category);
              return (
                <div
                  key={place.id}
                  className="card-minimal animate-fade-in group hover:shadow-rustic-lg transition-all cursor-pointer"
                  onClick={() => onNavigateToPlace?.(place.lat, place.lng)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-sand border-2 border-warm-stone rounded-lg flex items-center justify-center">
                      <CategoryIcon size={20} className="text-rust" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif font-semibold text-earth-brown">
                        {place.name}
                      </h3>
                      <p className="text-xs text-terracotta capitalize italic">
                        {place.category}
                      </p>
                    </div>
                  </div>
                  {place.description && (
                    <p className="text-sm text-rust mb-3 line-clamp-2 font-serif">
                      {place.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <Eye size={16} className="text-ocean-depth" />
                      <span className="text-sm font-serif font-medium text-midnight-blue">
                        {place.visit_count || 0} {place.visit_count === 1 ? 'visit' : 'visits'}
                      </span>
                    </div>
                    <span className="text-xs text-terracotta italic">
                      {new Date(place.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlaces.map((place) => {
              const CategoryIcon = getCategoryIcon(place.category);
              return (
                <div
                  key={place.id}
                  className="card-minimal animate-fade-in group hover:shadow-rustic-lg transition-all cursor-pointer"
                  onClick={() => onNavigateToPlace?.(place.lat, place.lng)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-full sm:w-20 h-20 bg-sand border-2 border-warm-stone rounded-lg flex items-center justify-center flex-shrink-0">
                      <CategoryIcon size={32} className="text-rust" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif font-semibold text-earth-brown mb-1">
                        {place.name}
                      </h3>
                      {place.description && (
                        <p className="text-sm text-rust mb-2 line-clamp-2 font-serif">
                          {place.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-terracotta capitalize italic">{place.category}</span>
                        <div className="flex items-center gap-1.5">
                          <Eye size={14} className="text-ocean-depth" />
                          <span className="text-sm font-serif font-medium text-midnight-blue">
                            {place.visit_count || 0}
                          </span>
                        </div>
                        <span className="text-xs text-terracotta italic">
                          {new Date(place.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
