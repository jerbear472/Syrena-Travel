'use client';

import { useState, useEffect } from 'react';
import {
  MapPin, ArrowLeft, Grid3x3, List, Search, Trash2, Globe2,
  Utensils, Coffee, Camera, Mountain, ShoppingBag, Hotel,
  Building2, Gem, Users, MoreHorizontal, DollarSign, Zap
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
        .eq('created_by', friend.id)
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="header-clean border-b border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="btn-icon"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium text-lg flex-shrink-0">
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
              <div key={stat.label} className="stat-card">
                <Icon className="stat-icon" size={20} />
                <div>
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-label">{stat.label}</p>
                  {stat.subtext && (
                    <p className="text-xs text-gray-500 mt-1">
                      {stat.subtext}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-clean pl-11 pr-3"
            />
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              aria-label="Grid view"
            >
              <Grid3x3 size={16} className={viewMode === 'grid' ? 'text-gray-900' : 'text-gray-500'} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              aria-label="List view"
            >
              <List size={16} className={viewMode === 'list' ? 'text-gray-900' : 'text-gray-500'} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner-minimal mx-auto mb-4"></div>
              <p className="text-gray-500">Loading places...</p>
            </div>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              {searchQuery ? 'No matching places' : 'No places yet'}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchQuery
                ? 'Try a different search term'
                : `${friend.display_name || friend.username} hasn't saved any places yet`
              }
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredPlaces.map((place) => {
              const CategoryIcon = getCategoryIcon(place.category);

              if (viewMode === 'grid') {
                return (
                  <div
                    key={place.id}
                    className="card-minimal overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => onNavigateToPlace?.(place.lat, place.lng)}
                  >
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CategoryIcon className="w-12 h-12 text-gray-300" />
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-1 bg-white rounded-md text-xs font-medium capitalize shadow-sm">
                        {place.category?.replace('-', ' ')}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                        {place.name}
                      </h3>
                      {place.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {place.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(place.created_at).toLocaleDateString()}</span>
                        {place.price_level && (
                          <div className="flex">
                            {[...Array(place.price_level)].map((_, i) => (
                              <DollarSign key={i} size={12} className="text-green-600" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div
                    key={place.id}
                    className="card-minimal p-4 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => onNavigateToPlace?.(place.lat, place.lng)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CategoryIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{place.name}</h3>
                          <span className="text-xs text-gray-500 capitalize whitespace-nowrap">
                            {place.category?.replace('-', ' ')}
                          </span>
                        </div>
                        {place.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {place.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{new Date(place.created_at).toLocaleDateString()}</span>
                          {place.price_level && (
                            <div className="flex">
                              {[...Array(place.price_level)].map((_, i) => (
                                <DollarSign key={i} size={12} className="text-green-600" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
