'use client';

import { useState, useEffect } from 'react';
import {
  MapPin, Grid3x3, List, Search, Globe2, ChevronDown, Filter,
  Plus, Trash2, Zap, Eye, Pencil
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { categoryMeta } from '@/lib/categories';
import { photoSrc } from '@/lib/photo';
import AddByCoordinatesModal from '@/components/AddByCoordinatesModal';
import AddPlaceModal from '@/components/AddPlaceModal';
import EditPlaceModal from '@/components/EditPlaceModal';

interface MyPlacesProps {
  onNavigateToPlace?: (lat: number, lng: number) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onEditProfile?: () => void;
}

export default function MyPlaces({ onNavigateToPlace, isSidebarOpen, onToggleSidebar, onEditProfile }: MyPlacesProps) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingPlace, setEditingPlace] = useState<any | null>(null);
  const [showCoordsModal, setShowCoordsModal] = useState(false);
  const [addCoords, setAddCoords] = useState<{ lat: number; lng: number } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadUserPlaces();
  }, []);

  const loadUserPlaces = async () => {
    setLoading(true);
    setLoadError(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Load places
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setSavedPlaces(data);
      } else if (error) {
        console.error('Error loading places:', error.code);
        setLoadError(true);
      }

      // Load user profile for XP/Level
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }
    }
    setLoading(false);
  };

  const deletePlace = async (place: any) => {
    if (!window.confirm(`Delete "${place.name}" from your places? This can't be undone.`)) return;
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', place.id);

    if (!error) {
      loadUserPlaces();
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => categoryMeta(category).Icon;

  const isRecent = (p: any) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(p.created_at) > weekAgo;
  };

  // Search → filter chip → sort
  const filteredPlaces = savedPlaces
    .filter(place =>
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(place => {
      if (selectedFilter === 'recent') return isRecent(place);
      if (selectedFilter === 'favorites') return (place.rating ?? 0) >= 4;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical': return a.name.localeCompare(b.name);
        case 'rating': return (b.rating ?? 0) - (a.rating ?? 0);
        case 'visited': return (b.visit_count ?? 0) - (a.visit_count ?? 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const filters = [
    { id: 'all', name: 'All', count: savedPlaces.length },
    { id: 'recent', name: 'Recently Added', count: savedPlaces.filter(isRecent).length },
    { id: 'favorites', name: 'Top Rated', count: savedPlaces.filter(p => p.rating >= 4).length }
  ];

  // Get unique cities/locations (using a simple approach based on lat/lng proximity)
  const getUniqueCities = () => {
    const cities = new Map();
    savedPlaces.forEach(place => {
      // Round coordinates to approximate city-level grouping (about 0.1 degrees ~ 11km)
      const cityKey = `${Math.round(place.lat * 10) / 10},${Math.round(place.lng * 10) / 10}`;
      cities.set(cityKey, true);
    });
    return cities.size;
  };

  const stats = [
    { label: 'Total Places', value: savedPlaces.length.toString(), icon: MapPin },
    { label: 'Cities', value: getUniqueCities().toString(), icon: Globe2 },
    { label: 'Level', value: userProfile?.level?.toString() || '1', icon: Zap, subtext: `${userProfile?.xp || 0} XP` }
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
      <header className="header-clean border-b-2 border-sea-mist">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="heading-2">My Places</h1>
            <p className="text-caption mt-1">
              Capture your favorite spots around the world
            </p>
          </div>
          <button
            onClick={() => setShowCoordsModal(true)}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span>Add Place</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="card-minimal p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon
                  size={18}
                  className="text-ocean-grey"
                />
                <span className="text-2xl font-display font-semibold text-midnight-blue">
                  {stat.value}
                </span>
              </div>
              <p className="text-caption">
                {stat.label}
              </p>
              {stat.subtext && (
                <p className="text-xs text-driftwood mt-1">
                  {stat.subtext}
                </p>
              )}
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
                    ? 'bg-primary text-white border-2 border-primary-dark shadow-rustic-md'
                    : 'bg-off-white text-midnight-blue border-2 border-sea-mist hover:border-primary/50'
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
            {onEditProfile && (
              <button
                onClick={onEditProfile}
                className="whitespace-nowrap px-4 py-2 rounded-md text-sm font-sans font-medium bg-off-white text-midnight-blue border-2 border-sea-mist hover:border-primary/50 transition-all"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-driftwood" size={16} />
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
                <div className="absolute right-0 mt-2 w-48 bg-off-white rounded-md shadow-rustic-lg border-2 border-sea-mist py-1 z-10 animate-slide-up">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSortBy(option.id);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-serif hover:bg-cream transition-colors ${
                        sortBy === option.id ? 'text-midnight-blue bg-cream font-semibold' : 'text-ocean-grey'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-off-white border-2 border-sea-mist rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`p-2 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'text-midnight-blue hover:bg-cream'
                }`}
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`p-2 transition-all ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'text-midnight-blue hover:bg-cream'
                }`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 lg:p-8 bg-cream/60">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner-minimal mx-auto mb-4"></div>
              <p className="text-driftwood font-serif">Loading your places...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <p className="text-body mb-4">Couldn't load your places.</p>
            <button onClick={loadUserPlaces} className="btn-secondary">Try again</button>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-sea-mist border-2 border-stone-blue rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin size={32} className="text-ocean-grey" />
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
                      onNavigateToPlace(Number(place.lat), Number(place.lng));
                    }
                  }}
                >
                  {place.photo_url && (
                    <div className="relative w-full h-32 -m-4 mb-3 rounded-t-lg overflow-hidden" style={{ width: 'calc(100% + 2rem)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoSrc(place.photo_url)}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: categoryMeta(place.category).subtle }}>
                      <CategoryIcon size={20} style={{ color: categoryMeta(place.category).color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif font-semibold text-midnight-blue">
                        {place.name}
                      </h3>
                      <p className="text-xs text-driftwood capitalize italic">
                        {place.category}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlace(place);
                      }}
                      title="Edit place"
                      className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil size={16} className="text-ocean-grey" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlace(place);
                      }}
                      title="Delete place"
                      className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} className="text-ocean-grey" />
                    </button>
                  </div>
                  {place.description && (
                    <p className="text-sm text-ocean-grey mb-3 line-clamp-2 font-serif">
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
                    <span className="text-xs text-driftwood italic">
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
                      onNavigateToPlace(Number(place.lat), Number(place.lng));
                    }
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-full sm:w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: categoryMeta(place.category).subtle }}>
                      <CategoryIcon size={32} style={{ color: categoryMeta(place.category).color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif font-semibold text-midnight-blue mb-1">
                        {place.name}
                      </h3>
                      {place.description && (
                        <p className="text-sm text-ocean-grey mb-2 line-clamp-2 font-serif">
                          {place.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-driftwood capitalize italic">{place.category}</span>
                        <div className="flex items-center gap-1.5">
                          <Eye size={14} className="text-ocean-depth" />
                          <span className="text-sm font-serif font-medium text-midnight-blue">
                            {place.visit_count || 0}
                          </span>
                        </div>
                        <span className="text-xs text-driftwood italic">
                          {new Date(place.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlace(place);
                        }}
                        title="Edit place"
                        className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil size={16} className="text-ocean-grey" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlace(place);
                        }}
                        title="Delete place"
                        className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} className="text-ocean-grey" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add place: coordinates first, then details */}
      <AddByCoordinatesModal
        isOpen={showCoordsModal}
        onClose={() => setShowCoordsModal(false)}
        onSubmit={(lat, lng) => {
          setShowCoordsModal(false);
          setAddCoords({ lat, lng });
        }}
      />
      {addCoords && (
        <AddPlaceModal
          isOpen={true}
          onClose={() => setAddCoords(null)}
          latitude={addCoords.lat}
          longitude={addCoords.lng}
          onPlaceAdded={loadUserPlaces}
        />
      )}

      {/* Edit place */}
      <EditPlaceModal
        place={editingPlace}
        onClose={() => setEditingPlace(null)}
        onSaved={loadUserPlaces}
      />
    </div>
  );
}