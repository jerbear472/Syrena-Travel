'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Search, Users, LogOut,
  Bookmark, Compass, Menu, X, ChevronLeft,
  MapPin, ArrowRight, User2
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

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('explore');
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [showCoordinatesModal, setShowCoordinatesModal] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setIsAuthenticated(!!session);
          setUser(session?.user || null);
        }
      );

      setLoading(false);
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
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
    setActiveTab('explore');

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
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="spinner-minimal mx-auto mb-4"></div>
          <p className="text-ocean-grey font-serif font-medium text-sm tracking-wide">Loading Syrena</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-cream">
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-charcoal-blue/30 z-40 transition-opacity backdrop-blur-sm"
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
        } sidebar-clean transition-all duration-200 overflow-hidden flex flex-col`}
        style={{ zIndex: 100 }}
      >
        {/* Logo Section */}
        <div className="p-4 border-b-2 border-sea-mist hover:bg-sea-mist/30 transition-colors flex-shrink-0">
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 flex-shrink-0 bg-cream rounded-xl shadow-rustic-sm border-2 border-stone-blue overflow-hidden flex items-center justify-center">
                <Image
                  src="/bluelyre.png"
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
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-midnight-blue rounded-full flex items-center justify-center text-cream font-serif font-semibold text-sm border-2 border-deep-teal">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-aqua-mist rounded-full border-2 border-off-white"></div>
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-serif font-semibold text-ocean-depth truncate">
                    {user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-ocean-grey font-sans truncate italic">{user?.email}</p>
                </div>
              )}
              {isSidebarOpen && (
                <NotificationBell onNavigateToFriends={() => setActiveTab('friends')} />
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
                  setActiveTab(item.id);
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
        {activeTab === 'explore' && (
          <>
            {/* Header */}
            <header className="header-clean">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="heading-2 flex items-center gap-2">
                      Explore
                      <MapPin className="text-ocean-grey" size={20} />
                    </h1>
                    <p className="text-caption mt-0.5">
                      {isAuthenticated
                        ? 'Click anywhere on the map to save a place'
                        : 'Sign in to start saving your favorite places'}
                    </p>
                  </div>
                </div>
                <SearchBar
                  onPlaceSelect={handlePlaceSelect}
                  onAddCoordinates={() => setShowCoordinatesModal(true)}
                  isLoaded={mapLoaded}
                />
              </div>
            </header>

            {/* Map Container */}
            <div className="flex-1 relative bg-sea-mist/20">
              <MapView
                isAuthenticated={isAuthenticated}
                center={mapCenter}
                onMapLoad={() => setMapLoaded(true)}
              />

              {/* Floating Help Text - positioned to avoid zoom controls */}
              {isAuthenticated && (
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
                        src="/bluelyre.png"
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

        {activeTab === 'my-places' && <MyPlaces key={Date.now()} onNavigateToPlace={handleNavigateToPlace} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(true)} />}
        {activeTab === 'friends' && <Friends isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(true)} onNavigateToPlace={handleNavigateToPlace} />}
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
                onClick={() => setActiveTab(item.id)}
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