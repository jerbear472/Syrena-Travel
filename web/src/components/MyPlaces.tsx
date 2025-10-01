'use client';

import { useState, useEffect } from 'react';
import {
  MapPin, Star, Clock, Heart, Grid3x3, List, Search,
  MoreVertical, Globe2, TrendingUp, ChevronDown, Filter,
  Plus, Utensils, Coffee, Camera, Mountain, ShoppingBag, Hotel, Trash2,
  Building2, Gem, Users, MoreHorizontal, Menu
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface MyPlacesProps {
  onNavigateToPlace?: (lat: number, lng: number) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function MyPlaces({ onNavigateToPlace, isSidebarOpen, onToggleSidebar }: MyPlacesProps) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadUserPlaces();
  }, []);

  const loadUserPlaces = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setSavedPlaces(data);
      }
    }
    setLoading(false);
  };

  const deletePlace = async (placeId: string) => {
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', placeId);

    if (!error) {
      loadUserPlaces();
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
  const filteredPlaces = savedPlaces.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filters = [
    { id: 'all', name: 'All Places', count: savedPlaces.length },
    { id: 'recent', name: 'Recently Added', count: savedPlaces.filter(p => {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 7);
      return new Date(p.created_at) > dayAgo;
    }).length },
    { id: 'favorites', name: 'Top Rated', count: savedPlaces.filter(p => p.rating >= 4).length }
  ];

  const stats = [
    { label: 'Total Places', value: savedPlaces.length.toString(), icon: MapPin },
    { label: 'Categories', value: [...new Set(savedPlaces.map(p => p.category))].length.toString(), icon: Globe2 },
    { label: 'Avg Rating', value: savedPlaces.length ? (savedPlaces.reduce((sum, p) => sum + (p.rating || 0), 0) / savedPlaces.length).toFixed(1) : '0', icon: Star },
    { label: 'Top Rated', value: savedPlaces.filter(p => p.rating >= 4).length.toString(), icon: Heart }
  ];

  const sortOptions = [
    { id: 'recent', label: 'Most Recent' },
    { id: 'alphabetical', label: 'Alphabetical' },
    { id: 'rating', label: 'Highest Rated' },
    { id: 'visited', label: 'Most Visited' }
  ];

  return (
    <div className="h-full flex flex-col bg-cream">
      {/* Header */}
      <header className="header-clean border-b-2 border-sand">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="heading-2">My Places</h1>
            <p className="text-caption mt-1">
              Capture your favorite spots around the world
            </p>
          </div>
          <button
            onClick={() => {
              alert('Add Place feature coming soon! You can add places by clicking on the map in Explore tab.');
            }}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span>Add Place</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="card-minimal p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon
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
            </div>
          ))}
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-sans font-medium transition-all ${
                  selectedFilter === filter.id
                    ? 'bg-earth-brown text-cream border-2 border-rust shadow-rustic-md'
                    : 'bg-off-white text-earth-brown border-2 border-warm-stone hover:bg-sand'
                }`}
              >
                {filter.name}
                {filter.count > 0 && (
                  <span className="ml-1.5 text-xs opacity-75">
                    ({filter.count})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-terracotta" size={16} />
              <input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-clean pl-10 pr-3 w-full lg:w-48"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="btn-secondary flex items-center gap-2"
              >
                <Filter size={16} />
                <span className="hidden sm:inline">
                  {sortOptions.find(o => o.id === sortBy)?.label}
                </span>
                <ChevronDown size={16} />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-off-white rounded-md shadow-rustic-lg border-2 border-sand py-1 z-10 animate-slide-up">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSortBy(option.id);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-serif hover:bg-sand transition-colors ${
                        sortBy === option.id ? 'text-earth-brown bg-sand font-semibold' : 'text-rust'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
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
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 lg:p-8 bg-sand/20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner-minimal mx-auto mb-4"></div>
              <p className="text-terracotta font-serif">Loading your places...</p>
            </div>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-sand border-2 border-warm-stone rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin size={32} className="text-rust" />
              </div>
              <h3 className="heading-3 mb-3">
                Start Building Your Map
              </h3>
              <p className="text-body mb-6">
                Every place tells a story. Start adding restaurants, viewpoints, cafés,
                and hidden gems to create your personal travel memory map.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-primary">
                Explore & Add Places
              </button>
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
                  onClick={() => {
                    if (onNavigateToPlace) {
                      console.log('Navigating to place:', place.name, 'at', place.lat, place.lng);
                      onNavigateToPlace(Number(place.lat), Number(place.lng));
                    }
                  }}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlace(place.id);
                      }}
                      className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} className="text-rust" />
                    </button>
                  </div>
                  {place.description && (
                    <p className="text-sm text-rust mb-3 line-clamp-2 font-serif">
                      {place.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < place.rating ? 'text-warning fill-warning' : 'text-warm-stone'}
                        />
                      ))}
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
                  onClick={() => {
                    if (onNavigateToPlace) {
                      console.log('Navigating to place:', place.name, 'at', place.lat, place.lng);
                      onNavigateToPlace(Number(place.lat), Number(place.lng));
                    }
                  }}
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
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={i < place.rating ? 'text-warning fill-warning' : 'text-warm-stone'}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-terracotta italic">
                          {new Date(place.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlace(place.id);
                      }}
                      className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} className="text-rust" />
                    </button>
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