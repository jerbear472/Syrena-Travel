'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Search, Users, LogOut,
  Bookmark, Compass, Menu, X, ChevronLeft,
  MapPin, ArrowRight, User2, Star, Filter,
  Utensils, Coffee, Hotel, Camera, Mountain,
  ShoppingBag, Building2, Gem, MoreHorizontal,
  Heart, Globe, Award, TrendingUp, Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import SearchBar from '@/components/SearchBar';
import AddByCoordinatesModal from '@/components/AddByCoordinatesModal';
import LyreIcon from '@/components/LyreIcon';
import NotificationBell from '@/components/NotificationBell';
import Image from 'next/image';

// Dynamic imports
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="spinner-minimal"></div>
    </div>
  )
});

const MyPlaces = dynamic(() => import('@/components/MyPlaces'), {
  ssr: false
});

const Friends = dynamic(() => import('@/components/FriendsNew'), {
  ssr: false
});

const ProfileSettings = dynamic(() => import('@/components/ProfileSettings'), {
  ssr: false
});

const SourceOfJourney = dynamic(() => import('@/components/SourceOfJourney'), {
  ssr: false
});

// Category definitions for filtering
const CATEGORIES = [
  { id: 'all', name: 'All Places', icon: Globe, color: 'bg-midnight-blue text-cream' },
  { id: 'restaurant', name: 'Restaurants', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'cafe', name: 'Cafés', icon: Coffee, color: 'bg-amber-100 text-amber-600' },
  { id: 'hotel', name: 'Hotels', icon: Hotel, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'viewpoint', name: 'Viewpoints', icon: Camera, color: 'bg-blue-100 text-blue-600' },
  { id: 'nature', name: 'Nature', icon: Mountain, color: 'bg-green-100 text-green-600' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'bg-purple-100 text-purple-600' },
  { id: 'museum', name: 'Museums', icon: Building2, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'hidden-gem', name: 'Hidden Gems', icon: Gem, color: 'bg-pink-100 text-pink-600' },
  { id: 'my-picks', name: 'My Picks', icon: Star, color: 'bg-siren-gold/20 text-siren-gold' },
];

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('explore');
  const [displayedTab, setDisplayedTab] = useState('explore');
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [showCoordinatesModal, setShowCoordinatesModal] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [searchResultPlace, setSearchResultPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [showSaveFromSearch, setShowSaveFromSearch] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const switchTab = useCallback((newTab: string) => {
    if (newTab === activeTab) return;
    setTabTransitioning(true);
    // Short fade-out, then swap content and fade-in
    setTimeout(() => {
      setActiveTab(newTab);
      setDisplayedTab(newTab);
      // Allow a frame for React to render the new content before fading in
      requestAnimationFrame(() => {
        setTabTransitioning(false);
      });
    }, 180);
  }, [activeTab]);

  const handleResize = () => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) {
      setIsSidebarOpen(false);
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUser(user);

      if (user) {
        loadUserProfile(user.id);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setIsAuthenticated(!!session);
          setUser(session?.user || null);
          if (session?.user) {
            loadUserProfile(session.user.id);
          } else {
            setUserProfile(null);
          }
        }
      );

      setLoading(false);
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setUserProfile(profile);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setActiveTab('explore');
  };

  const handleNavigateToPlace = (lat: number, lng: number) => {
    // Set new center with the exact coordinates
    setMapCenter({ lat, lng });
    switchTab('explore');

    // Clear the center after a longer delay to allow navigation to complete
    // This prevents the map from jumping back to user location
    setTimeout(() => {
      setMapCenter(null);
    }, 5000);
  };

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      handleNavigateToPlace(lat, lng);
      // Store the search result for potential saving
      setSearchResultPlace(place);
      setShowSaveFromSearch(true);
      // Auto-hide after 10 seconds
      setTimeout(() => setShowSaveFromSearch(false), 10000);
    }
  };

  const handleSaveSearchResult = async () => {
    if (!searchResultPlace || !isAuthenticated) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const lat = searchResultPlace.geometry?.location?.lat();
    const lng = searchResultPlace.geometry?.location?.lng();

    if (!lat || !lng) return;

    // Determine category from place types
    let category = 'other';
    const types = searchResultPlace.types || [];
    if (types.includes('restaurant') || types.includes('food')) category = 'restaurant';
    else if (types.includes('cafe') || types.includes('coffee')) category = 'cafe';
    else if (types.includes('hotel') || types.includes('lodging')) category = 'hotel';
    else if (types.includes('shopping_mall') || types.includes('store')) category = 'shopping';
    else if (types.includes('museum') || types.includes('art_gallery')) category = 'museum';
    else if (types.includes('park') || types.includes('natural_feature')) category = 'nature';
    else if (types.includes('tourist_attraction')) category = 'viewpoint';

    try {
      const { error } = await supabase
        .from('places')
        .insert({
          name: searchResultPlace.name || 'Unnamed Place',
          description: searchResultPlace.formatted_address || '',
          category,
          lat,
          lng,
          user_id: user.id,
          visit_count: 0
        });

      if (error) throw error;

      setShowSaveFromSearch(false);
      setSearchResultPlace(null);
      setMapKey(prev => prev + 1); // Refresh map
      alert('Place saved to your favorites!');
    } catch (err: any) {
      console.error('Error saving place:', err);
      alert('Failed to save place');
    }
  };

  const handleCoordinatesSubmit = (lat: number, lng: number) => {
    setShowCoordinatesModal(false);
    handleNavigateToPlace(lat, lng);
  };

  const navigationItems = [
    {
      id: 'explore',
      name: 'Explore',
      icon: Compass,
      description: 'Discover places'
    },
    {
      id: 'source',
      name: 'Source',
      icon: Sparkles,
      description: 'AI concierge'
    },
    {
      id: 'my-places',
      name: 'My Places',
      icon: LyreIcon,
      description: 'Saved locations'
    },
    {
      id: 'friends',
      name: 'Friends',
      icon: Users,
      description: 'Community'
    },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream page-loader">
        <div className="text-center">
          <div className="spinner-minimal mx-auto mb-5"></div>
          <p className="text-ocean-grey font-serif font-medium text-sm tracking-widest uppercase" style={{ letterSpacing: '0.2em' }}>Syrena</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-cream">
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-charcoal-blue/30 z-40 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Floating Menu Button for Mobile */}
      {isMobile && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 btn-icon bg-off-white shadow-rustic-md border-2 border-sea-mist"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : isMobile ? 'w-0' : 'w-16'
        } ${
          isMobile ? 'fixed inset-y-0 left-0 z-[100]' : 'relative'
        } ${
          isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'
        } sidebar-clean overflow-hidden flex flex-col`}
        style={{
          transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 100,
        }}
      >
        {/* Logo Section */}
        <div className="p-4 border-b-2 border-sea-mist hover:bg-sea-mist/30 transition-colors flex-shrink-0">
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 flex-shrink-0 bg-cream rounded-xl shadow-rustic-sm border-2 border-stone-blue overflow-hidden flex items-center justify-center">
                <Image
                  src="/SYRENABAROQUE.png"
                  alt="Syrena"
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              </div>
              {isSidebarOpen && (
                <div>
                  <h1 className="text-4xl font-display font-semibold siren-shimmer tracking-tight">
                    Syrena
                  </h1>
                  <p className="text-[10px] font-sans font-semibold text-ocean-grey tracking-[0.35em] uppercase mt-0.5">Travel Map</p>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="btn-icon"
                aria-label="Close sidebar"
              >
                {isMobile ? <X size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-b-2 border-sea-mist flex-shrink-0">
          {isAuthenticated ? (
            <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
              <button
                onClick={() => switchTab('profile')}
                className="relative flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 bg-midnight-blue rounded-full flex items-center justify-center text-cream font-serif font-semibold text-sm border-2 border-deep-teal overflow-hidden">
                  {userProfile?.avatar_url ? (
                    <Image
                      src={userProfile.avatar_url}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.email?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-aqua-mist rounded-full border-2 border-off-white"></div>
              </button>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-serif font-semibold text-ocean-depth truncate">
                    {userProfile?.display_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-ocean-grey font-sans truncate italic">{user?.email}</p>
                </div>
              )}
              {isSidebarOpen && (
                <NotificationBell onNavigateToFriends={() => switchTab('friends')} />
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isSidebarOpen ? (
                <>
                  <User2 size={18} />
                  <span>Sign In</span>
                </>
              ) : (
                <User2 size={18} />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  switchTab(item.id);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full nav-item-clean ${
                  isActive ? 'active' : ''
                } ${!isSidebarOpen && 'justify-center px-2'}`}
                style={{ overflow: 'hidden' }}
              >
                <Icon
                  size={18}
                  className="flex-shrink-0"
                />
                {isSidebarOpen && (
                  <div className="text-left flex-1">
                    <p className="font-medium">
                      {item.name}
                    </p>
                    <p className="text-xs opacity-75">
                      {item.description}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t-2 border-sea-mist overflow-hidden flex-shrink-0 mb-16">
          {isAuthenticated && isSidebarOpen && (
            <button
              onClick={handleSignOut}
              className="w-full nav-item-clean hover:bg-ocean-depth/10 text-ocean-depth group border-ocean-depth/20"
            >
              <LogOut size={16} />
              <span className="font-medium">Sign Out</span>
            </button>
          )}
          {!isSidebarOpen && (
            <div className="flex flex-col gap-2 items-center">
              {isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  className="btn-icon hover:bg-ocean-depth/10 text-ocean-depth"
                  aria-label="Sign out"
                >
                  <LogOut size={18} />
                </button>
              )}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="btn-icon bg-midnight-blue text-cream hover:bg-deep-teal border-2 border-deep-teal"
                aria-label="Open sidebar"
              >
                <Menu size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-cream">
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            opacity: tabTransitioning ? 0 : 1,
            transform: tabTransitioning ? 'translateY(4px)' : 'translateY(0)',
            transition: tabTransitioning
              ? 'opacity 0.15s ease-out, transform 0.15s ease-out'
              : 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
        {activeTab === 'explore' && (
          <>
            {/* Enhanced Michelin Guide-Inspired Header */}
            <header className="bg-gradient-to-r from-off-white via-cream to-off-white border-b-2 border-sea-mist shadow-rustic-sm">
              {/* Top Bar - Brand & Stats */}
              <div className="px-6 py-3 border-b border-sea-mist/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Award className="text-siren-gold" size={18} />
                    <span className="text-xs font-sans font-semibold text-midnight-blue tracking-wide uppercase">Curated Selections</span>
                  </div>
                  <div className="h-4 w-px bg-sea-mist hidden sm:block" />
                  <div className="hidden sm:flex items-center gap-2">
                    <TrendingUp className="text-deep-teal" size={14} />
                    <span className="text-xs text-ocean-grey italic">Discover exceptional places</span>
                  </div>
                </div>
                {isAuthenticated && userProfile && (
                  <div className="flex items-center gap-2 text-xs text-ocean-grey">
                    <Star className="text-siren-gold" size={14} />
                    <span className="font-serif">{userProfile.display_name || 'Explorer'}'s Collection</span>
                  </div>
                )}
              </div>

              {/* Main Header Row */}
              <div className="px-6 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Title Section */}
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex w-12 h-12 rounded-xl bg-midnight-blue items-center justify-center shadow-rustic-md">
                      <Compass className="text-cream" size={24} />
                    </div>
                    <div>
                      <h1 className="heading-2 flex items-center gap-2">
                        Explore
                        <span className="text-siren-gold">•</span>
                        <span className="text-lg font-normal text-ocean-grey">World Map</span>
                      </h1>
                      <p className="text-caption mt-0.5">
                        {isAuthenticated
                          ? 'Click anywhere on the map to save a place'
                          : 'Sign in to start curating your travel collection'}
                      </p>
                    </div>
                  </div>

                  {/* Search & Filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <SearchBar
                      onPlaceSelect={handlePlaceSelect}
                      onAddCoordinates={() => setShowCoordinatesModal(true)}
                      isLoaded={mapLoaded}
                    />

                    {/* Category Filter Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                        className={`btn-icon border-2 ${showCategoryFilter || selectedCategory !== 'all' ? 'bg-midnight-blue text-cream border-deep-teal' : 'bg-off-white border-stone-blue text-midnight-blue'} h-[48px] px-4 flex items-center gap-2`}
                      >
                        <Filter size={16} />
                        <span className="text-sm font-sans hidden sm:inline">
                          {selectedCategory === 'all' ? 'Filter' : CATEGORIES.find(c => c.id === selectedCategory)?.name}
                        </span>
                      </button>

                      {/* Category Dropdown */}
                      {showCategoryFilter && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowCategoryFilter(false)} />
                          <div className="absolute right-0 top-full mt-2 w-64 bg-off-white rounded-lg shadow-rustic-xl border-2 border-sea-mist py-2 z-50 animate-scale-in max-h-80 overflow-y-auto" style={{ transformOrigin: 'top right' }}>
                            <div className="px-3 py-2 border-b border-sea-mist mb-1">
                              <span className="text-xs font-sans font-semibold text-ocean-grey uppercase tracking-wide">Filter by Category</span>
                            </div>
                            {CATEGORIES.map((cat) => {
                              const Icon = cat.icon;
                              return (
                                <button
                                  key={cat.id}
                                  onClick={() => {
                                    setSelectedCategory(cat.id);
                                    setShowCategoryFilter(false);
                                  }}
                                  className={`w-full px-3 py-2.5 text-left hover:bg-sea-mist/50 transition-colors flex items-center gap-3 ${
                                    selectedCategory === cat.id ? 'bg-sea-mist' : ''
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color}`}>
                                    <Icon size={16} />
                                  </div>
                                  <span className={`text-sm font-serif ${selectedCategory === cat.id ? 'font-semibold text-midnight-blue' : 'text-ocean-depth'}`}>
                                    {cat.name}
                                  </span>
                                  {selectedCategory === cat.id && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-deep-teal" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Pills - Horizontal scroll on mobile */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  {CATEGORIES.slice(0, 6).map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                          isActive
                            ? 'bg-midnight-blue text-cream border-deep-teal shadow-rustic-md'
                            : 'bg-off-white text-ocean-depth border-stone-blue hover:border-driftwood hover:bg-sea-mist/30'
                        }`}
                        style={{
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <Icon size={14} />
                        <span className="text-sm font-sans font-medium whitespace-nowrap">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>

            {/* Map Container */}
            <div className="flex-1 relative bg-sea-mist/20">
              <MapView
                key={mapKey}
                isAuthenticated={isAuthenticated}
                center={mapCenter}
                onMapLoad={() => setMapLoaded(true)}
                categoryFilter={selectedCategory}
              />

              {/* Save from Search - Floating Card */}
              {showSaveFromSearch && searchResultPlace && isAuthenticated && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-off-white rounded-xl shadow-rustic-xl border-2 border-siren-gold/50 p-4 max-w-md w-[90%] animate-slide-up z-30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-siren-gold/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="text-siren-gold" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-semibold text-midnight-blue truncate">
                        {searchResultPlace.name}
                      </h3>
                      <p className="text-xs text-ocean-grey truncate mt-0.5">
                        {searchResultPlace.formatted_address}
                      </p>
                      {searchResultPlace.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="text-siren-gold fill-siren-gold" size={12} />
                          <span className="text-xs font-sans text-ocean-depth">{searchResultPlace.rating}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSaveFromSearch(false)}
                        className="btn-icon text-ocean-grey hover:text-midnight-blue"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleSaveSearchResult}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5"
                    >
                      <Heart size={16} />
                      <span>Save to Favorites</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Help Text - positioned to avoid zoom controls */}
              {isAuthenticated && !showSaveFromSearch && (
                <div className="absolute bottom-6 left-6 bg-off-white rounded-lg shadow-rustic-lg border-2 border-stone-blue p-3 flex items-center gap-2 max-w-sm">
                  <MapPin className="text-deep-teal" size={18} />
                  <span className="text-sm text-midnight-blue font-serif font-medium">Click anywhere on the map to add a place</span>
                </div>
              )}

              {/* Welcome Card */}
              {!isAuthenticated && (
                <div className="absolute bottom-6 left-6 right-6 sm:right-auto card-minimal max-w-md animate-slide-up p-6 shadow-rustic-xl">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative w-20 h-20 bg-cream rounded-xl shadow-rustic-sm border-2 border-stone-blue overflow-hidden flex items-center justify-center">
                      <Image
                        src="/SYRENABAROQUE.png"
                        alt="Syrena"
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <h3 className="heading-3">
                        Welcome to Syrena
                      </h3>
                      <p className="text-caption">
                        Your personal travel map
                      </p>
                    </div>
                  </div>
                  <p className="text-body mb-6">
                    Create your personal travel map and share discoveries with friends.
                    Pin your favorite spots and build your travel story.
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <span className="font-medium text-base">Get Started</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'source' && <SourceOfJourney isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(true)} onNavigateToPlace={handleNavigateToPlace} />}
        {activeTab === 'my-places' && <MyPlaces key={Date.now()} onNavigateToPlace={handleNavigateToPlace} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(true)} onEditProfile={() => switchTab('profile')} />}
        {activeTab === 'friends' && <Friends isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(true)} onNavigateToPlace={handleNavigateToPlace} />}
        {activeTab === 'profile' && <ProfileSettings onBack={() => {
          switchTab('explore');
          loadUserProfile(user?.id);
          setMapKey(prev => prev + 1); // Force map to reload with new icon
        }} />}
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          checkAuth();
        }}
      />

      {/* Add by Coordinates Modal */}
      <AddByCoordinatesModal
        isOpen={showCoordinatesModal}
        onClose={() => setShowCoordinatesModal(false)}
        onSubmit={handleCoordinatesSubmit}
      />

      {/* Mobile Bottom Navigation Bar - Only show on mobile */}
      {isMobile && activeTab !== 'explore' && (
        <div className="mobile-bottom-nav flex items-center justify-around h-16 px-4 safe-bottom bg-off-white border-t-2 border-sea-mist shadow-rustic-lg">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => switchTab(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-midnight-blue bg-sea-mist' : 'text-ocean-grey'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] mt-1 font-sans font-semibold">{item.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}