'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Star, Loader2, AlertCircle, Check, Heart, Navigation, Utensils, Coffee, Camera, Mountain, ShoppingBag, Hotel, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import AddPlaceModal from './AddPlaceModal';
import PlaceDetailsModal from './PlaceDetailsModal';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 37.7749,
  lng: -122.4194
};

const mapStyles = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c8e6f5" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e0e0e0" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#d4f1d4" }]
  }
];

interface MapViewProps {
  isAuthenticated?: boolean;
  center?: { lat: number; lng: number } | null;
  onMapLoad?: () => void;
}

const MapView = ({ isAuthenticated: isAuthProp = false, center: centerProp, onMapLoad }: MapViewProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [clickedLocation, setClickedLocation] = useState<{lat: number; lng: number} | null>(null);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isAuthProp);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(null);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const allMarkersRef = useRef<google.maps.Marker[]>([]);
  const [currentZoom, setCurrentZoom] = useState(14);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [loadingPlaceDetails, setLoadingPlaceDetails] = useState(false);
  const [showOnlyFriends, setShowOnlyFriends] = useState(false);
  const [markerAnimation, setMarkerAnimation] = useState({ scale: 1, opacity: 1 });

  const supabase = createClient();

  // Check if API key exists
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasValidKey = apiKey && apiKey !== 'your-google-maps-api-key-here';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'google-map-script',
    libraries: ['places']
  });

  useEffect(() => {
    setIsAuthenticated(isAuthProp);
  }, [isAuthProp]);

  // Navigate to place when center prop changes
  useEffect(() => {
    if (centerProp && map) {
      const newCenter = { lat: centerProp.lat, lng: centerProp.lng };
      setCenter(newCenter);
      map.panTo(newCenter);
      map.setZoom(17);
      setHasNavigated(true); // Mark that we've navigated to a specific place
      // Clear the centerProp after navigation to allow re-navigation to same place
      setTimeout(() => {
        map.panTo(newCenter); // Ensure it pans even if already at location
      }, 100);

      // Reset the navigation flag after some time
      setTimeout(() => {
        setHasNavigated(false);
      }, 5000);
    }
  }, [centerProp, map]);

  useEffect(() => {
    // Get current user first
    getCurrentUser();

    // Get user location
    if (navigator.geolocation && isLoaded) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newPos);
          // Only set center on initial load when there's no centerProp and we haven't navigated
          // This prevents jumping back to user location when navigating to a place
          if (!centerProp && !hasNavigated) {
            setCenter(newPos);
          }
        },
        (error) => {
          console.log('Location access denied, using default location');
        }
      );
    }
  }, [isLoaded]); // Remove centerProp from dependencies

  // Load places when map is ready, authentication changes, or filter changes
  useEffect(() => {
    if (isLoaded && map) {
      loadAllPlaces();
    }
  }, [isLoaded, map, isAuthenticated, showOnlyFriends]);

  // Update markers when map or saved places change (but NOT on zoom changes to prevent flashing)
  useEffect(() => {
    if (map && savedPlaces.length > 0) {
      updateMarkers(savedPlaces, currentZoom);
    }
  }, [map, savedPlaces]);

  // Function to fetch place details from Google Places API
  const fetchPlaceDetails = async (lat: number, lng: number) => {
    if (!map) return null;

    setLoadingPlaceDetails(true);
    try {
      const service = new google.maps.places.PlacesService(map);

      // First, try to find the exact place at the clicked location with a very tight radius
      return new Promise((resolve) => {
        // Try very close proximity first (10 meters) - use radius alone
        service.nearbySearch(
          {
            location: { lat, lng },
            radius: 10
          },
          (results, status) => {
            // If we found something very close, use it
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              // Filter out generic place types like cities, neighborhoods, postal codes
              const genericTypes = ['locality', 'political', 'neighborhood', 'administrative_area_level_1',
                                   'administrative_area_level_2', 'country', 'postal_code', 'sublocality'];

              const realPlaces = results.filter(place => {
                const hasGenericType = place.types?.some(type => genericTypes.includes(type));
                const hasSpecificType = place.types?.some(type =>
                  ['restaurant', 'cafe', 'bar', 'store', 'lodging', 'museum', 'park',
                   'tourist_attraction', 'point_of_interest', 'establishment'].includes(type)
                );
                return hasSpecificType && !hasGenericType;
              });

              if (realPlaces.length > 0) {
                // This is a real place, not just a location
                fetchPlaceDetailsById(realPlaces[0].place_id!, service, resolve);
                return;
              }
            }

            // If we didn't find a specific place, try a slightly wider radius
            service.nearbySearch(
              {
                location: { lat, lng },
                radius: 50
              },
              (results2, status2) => {
                if (status2 === google.maps.places.PlacesServiceStatus.OK && results2 && results2.length > 0) {
                  // Filter to only get actual establishments
                  const genericTypes = ['locality', 'political', 'neighborhood', 'administrative_area_level_1',
                                       'administrative_area_level_2', 'country', 'postal_code', 'sublocality'];

                  const realPlaces = results2.filter(place => {
                    const hasGenericType = place.types?.some(type => genericTypes.includes(type));
                    const hasSpecificType = place.types?.some(type =>
                      ['restaurant', 'cafe', 'bar', 'store', 'lodging', 'museum', 'park',
                       'tourist_attraction', 'point_of_interest', 'establishment'].includes(type)
                    );
                    return hasSpecificType && !hasGenericType;
                  });

                  if (realPlaces.length > 0) {
                    fetchPlaceDetailsById(realPlaces[0].place_id!, service, resolve);
                    return;
                  }
                }

                // No specific place found
                setLoadingPlaceDetails(false);
                resolve(null);
              }
            );
          }
        );
      });
    } catch (error) {
      console.error('Error fetching place details:', error);
      setLoadingPlaceDetails(false);
      return null;
    }
  };

  // Helper function to fetch full place details by place_id
  const fetchPlaceDetailsById = (
    placeId: string,
    service: google.maps.places.PlacesService,
    resolve: (value: any) => void
  ) => {
    service.getDetails(
      {
        placeId: placeId,
        fields: ['name', 'rating', 'price_level', 'photos', 'types', 'formatted_address', 'business_status']
      },
      (placeDetails, detailStatus) => {
        setLoadingPlaceDetails(false);
        if (detailStatus === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
          resolve({
            name: placeDetails.name || '',
            rating: placeDetails.rating || 0,
            priceLevel: placeDetails.price_level || 0,
            photos: placeDetails.photos?.slice(0, 3).map(photo => photo.getUrl({ maxWidth: 400 })) || [],
            types: placeDetails.types || [],
            address: placeDetails.formatted_address || '',
            businessStatus: placeDetails.business_status
          });
        } else {
          resolve(null);
        }
      }
    );
  };

  // Add map click listener that updates with authentication state
  useEffect(() => {
    if (!map) return;

    console.log('Setting up map click listener. isAuthenticated:', isAuthenticated);

    const clickListener = map.addListener('click', async (event: google.maps.MapMouseEvent) => {
      console.log('Map clicked!', { isAuthenticated, latLng: event.latLng });
      if (event.latLng) {
        if (!isAuthenticated) {
          console.log('User not authenticated, ignoring click');
          return;
        }
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        console.log('User is authenticated, setting location:', { lat, lng });

        // Set location and trigger animation
        setClickedLocation({ lat, lng });
        setSelectedLocation({ lat, lng });

        // Start animation: drop from above with fade in
        setMarkerAnimation({ scale: 0.3, opacity: 0 });

        // Animate to full scale with bounce effect
        setTimeout(() => setMarkerAnimation({ scale: 1.15, opacity: 1 }), 50);
        setTimeout(() => setMarkerAnimation({ scale: 0.95, opacity: 1 }), 200);
        setTimeout(() => setMarkerAnimation({ scale: 1.05, opacity: 1 }), 300);
        setTimeout(() => setMarkerAnimation({ scale: 1, opacity: 1 }), 400);

        // Fetch place details from Google Places API
        const details = await fetchPlaceDetails(lat, lng);
        setPlaceDetails(details);

        setShowAddPlaceModal(true);
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, isAuthenticated]);

  const onLoad = useCallback(async (map: google.maps.Map) => {
    setMap(map);

    // Notify parent that map is loaded
    if (onMapLoad) {
      onMapLoad();
    }

    // Add zoom change listener
    map.addListener('zoom_changed', () => {
      const zoom = map.getZoom();
      if (zoom) {
        setCurrentZoom(zoom);
      }
    });

    // Dynamically import MarkerClusterer to avoid SSR issues
    try {
      const { MarkerClusterer, GridAlgorithm } = await import('@googlemaps/markerclusterer');

      // Initialize marker clusterer with custom renderer - dark background with sleek font
      const renderer = {
        render: ({ count, position }: any) => {
          const svg = window.btoa(`
            <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
                </filter>
              </defs>
              <circle cx="32" cy="32" r="30" fill="#171717" stroke="#FFFFFF" stroke-width="2" filter="url(#shadow)"/>
              <text x="32" y="38" text-anchor="middle" fill="white" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="18" font-weight="500">${count}</text>
            </svg>
          `);

          return new google.maps.Marker({
            position,
            icon: {
              url: `data:image/svg+xml;base64,${svg}`,
              scaledSize: new google.maps.Size(64, 64),
              anchor: new google.maps.Point(32, 32)
            },
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          });
        }
      };

      // Create clusterer but don't add markers yet
      clustererRef.current = new MarkerClusterer({
        map: null, // Don't attach to map initially
        renderer,
        algorithm: new GridAlgorithm({
          maxDistance: 100,  // Wider clustering distance for city-wide view
          gridSize: 80       // Larger grid for city-level clustering
        }),
        onClusterClick: (event: any, cluster: any, map: any) => {
          // Zoom in when cluster is clicked
          map.fitBounds(cluster.bounds);
        }
      });
    } catch (error) {
      console.error('Failed to load MarkerClusterer:', error);
      // Map will still work without clustering
    }
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const loadAllPlaces = async () => {
    console.log('Loading all places... (MapView mounted/reloaded)');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in - show no places
      console.log('No user logged in');
      setSavedPlaces([]);
      return;
    }

    console.log('Fetching places for user:', user.id, 'showOnlyFriends:', showOnlyFriends);

    try {
      if (showOnlyFriends) {
        // Get user's accepted friends
        const { data: friendships, error: friendError } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        if (friendError) {
          console.error('Error loading friendships:', friendError);
          setSavedPlaces([]);
          return;
        }

        // Extract friend IDs
        const friendIds = friendships?.map(f =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        ) || [];

        console.log('Friend IDs:', friendIds);

        if (friendIds.length === 0) {
          // No friends, show empty
          setSavedPlaces([]);
          return;
        }

        // Fetch places from friends
        const { data: placesData, error: placesError } = await supabase
          .from('places')
          .select('*')
          .in('created_by', friendIds)
          .order('created_at', { ascending: false });

        if (placesError) {
          console.error('Error loading friends places:', placesError);
          return;
        }

        // Fetch profiles for all friends
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, odyssey_icon')
          .in('id', friendIds);

        console.log('Loaded friends places:', placesData?.length || 0);
        console.log('Loaded friend profiles:', profilesData?.length || 0);

        // Attach profile to each place based on created_by
        const placesWithProfile = placesData?.map(place => {
          const profile = profilesData?.find(p => p.id === place.created_by);
          return {
            ...place,
            profile: profile
          };
        }) || [];

        console.log('First friend place with profile:', placesWithProfile?.[0]);

        if (placesWithProfile) {
          setSavedPlaces(placesWithProfile);
          if (map) {
            const zoom = map.getZoom() || currentZoom;
            updateMarkers(placesWithProfile, zoom);
          }
        }
      } else {
        // Load user's own places
        const { data: placesData, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (placesError) {
          console.error('Error loading places:', placesError);
          return;
        }

        // Get user's profile for odyssey icon
        const { data: profileData } = await supabase
          .from('profiles')
          .select('odyssey_icon')
          .eq('id', user.id)
          .single();

        console.log('Loaded my places:', placesData?.length || 0);
        console.log('User profile odyssey_icon:', profileData?.odyssey_icon);

        // Attach profile to each place
        const placesWithProfile = placesData?.map(place => ({
          ...place,
          profile: profileData
        })) || [];

        console.log('First my place with profile:', placesWithProfile?.[0]);

        if (placesWithProfile) {
          setSavedPlaces(placesWithProfile);
          if (map) {
            const zoom = map.getZoom() || currentZoom;
            updateMarkers(placesWithProfile, zoom);
          }
        }
      }
    } catch (err) {
      console.error('Error in loadAllPlaces:', err);
    }
  };

  const updateMarkers = (places: any[], zoom: number) => {
    console.log('updateMarkers called with', places.length, 'places');
    // Clear all existing markers from both map and clusterer
    allMarkersRef.current.forEach(marker => marker.setMap(null));
    allMarkersRef.current = [];
    markersRef.current = [];

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    if (!map) return;

    // Create markers using the same lyre-circle.svg as the temp marker
    const allMarkers: google.maps.Marker[] = [];

    places.forEach(place => {
      console.log('Creating marker for place:', place.name, 'at', place.lat, place.lng);
      console.log('Place data:', JSON.stringify(place, null, 2));

      // Get the odyssey icon from the place's creator profile
      const odysseyIcon = place.profile?.odyssey_icon;
      console.log('Odyssey icon for', place.name, ':', odysseyIcon);

      let iconConfig;
      if (odysseyIcon) {
        // Use circular odyssey icon
        const iconName = odysseyIcon.replace('.png', '-circle.svg');
        iconConfig = {
          url: `/avatars/${iconName}`,
          scaledSize: new google.maps.Size(60, 60),
          anchor: new google.maps.Point(30, 30)
        };
      } else {
        // Default to lyre icon
        iconConfig = {
          url: '/lyre-circle.svg',
          scaledSize: new google.maps.Size(60, 60),
          anchor: new google.maps.Point(30, 30)
        };
      }

      const marker = new google.maps.Marker({
        position: { lat: Number(place.lat), lng: Number(place.lng) },
        icon: iconConfig,
        map: null,
        zIndex: 1000,
        optimized: false
      });

      // Store place data
      (marker as any).placeData = place;

      // Add click listener
      marker.addListener('click', (e: any) => {
        // Stop the click from reaching the map
        if (e && e.stop) {
          e.stop();
        }
        console.log('Marker clicked:', place.name);
        setSelectedPlace(place);
        setShowPlaceDetails(true);
        // Clear any clicked location to prevent showing the temporary marker
        setClickedLocation(null);
      });

      allMarkers.push(marker);
    });

    console.log('Created', allMarkers.length, 'markers, setting them on map');
    markersRef.current = allMarkers;
    allMarkersRef.current = allMarkers;

    // Disable clustering completely - always show individual markers
    // This provides a cleaner, more consistent experience
    if (clustererRef.current) {
      clustererRef.current.setMap(null);
    }

    // Always show all markers
    allMarkers.forEach(marker => {
      marker.setMap(map);
    });
    console.log('All markers added to map');
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadUserPlaces = async () => {
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
  };

  const handlePlaceAdded = () => {
    console.log('Place added! Reloading places...');
    setClickedLocation(null);
    loadAllPlaces(); // This will also call updateMarkers
  };

  const centerOnUser = () => {
    if (userLocation && map) {
      map.panTo(userLocation);
      map.setZoom(15);
    }
  };

  // Show configuration helper if no API key
  if (!hasValidKey) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Google Maps Setup Required</h3>
              <p className="text-sm text-gray-500">Add your API key to enable the map</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-3">
              Add your Google Maps API key to <code className="bg-white px-2 py-1 rounded text-xs">web/.env.local</code>:
            </p>
            <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-api-key-here
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            After adding your API key, restart the development server to see the map.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Map Loading Error</h3>
          <p className="text-gray-600 text-center mb-4">
            {loadError.message || 'Failed to load Google Maps'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: mapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true,
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: 'M 0,0 m -8,0 a 8,8 0 1,1 16,0 a 8,8 0 1,1 -16,0',
              scale: 1,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
          />
        )}

        {/* Saved places are now handled by marker clusterer */}

        {/* Clicked location marker (temp) - made larger (60x60) */}
        {clickedLocation && (
          <Marker
            position={clickedLocation}
            icon={{
              url: '/lyre-circle.svg',
              scaledSize: new google.maps.Size(60 * markerAnimation.scale, 60 * markerAnimation.scale),
              anchor: new google.maps.Point(30 * markerAnimation.scale, 30 * markerAnimation.scale)
            }}
            zIndex={1001}
            opacity={markerAnimation.opacity}
            options={{
              optimized: false
            }}
          />
        )}
      </GoogleMap>

      {/* Center on user button - positioned below map controls */}
      {userLocation && (
        <button
          onClick={centerOnUser}
          className="absolute top-24 right-3 bg-white p-3 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <Navigation className="w-5 h-5 text-midnight-blue" />
        </button>
      )}

      {/* Friend filter button */}
      {isAuthenticated && (
        <button
          onClick={() => setShowOnlyFriends(!showOnlyFriends)}
          className={`absolute top-40 right-3 p-3 rounded-lg shadow-lg hover:shadow-xl transition-all ${
            showOnlyFriends
              ? 'bg-midnight-blue text-cream'
              : 'bg-white text-midnight-blue hover:bg-gray-50'
          }`}
          title={showOnlyFriends ? "Show my places" : "Show friends' places"}
        >
          <Users className={`w-5 h-5 ${showOnlyFriends ? 'text-cream' : 'text-midnight-blue'}`} />
        </button>
      )}

      {/* Add Place Modal */}
      {selectedLocation && (
        <AddPlaceModal
          isOpen={showAddPlaceModal}
          onClose={() => {
            setShowAddPlaceModal(false);
            setClickedLocation(null);
            setSelectedLocation(null);
            setPlaceDetails(null);
          }}
          latitude={selectedLocation.lat}
          longitude={selectedLocation.lng}
          onPlaceAdded={handlePlaceAdded}
          placeDetails={placeDetails}
          loadingPlaceDetails={loadingPlaceDetails}
        />
      )}


      {/* Place Details Modal */}
      {selectedPlace && (
        <PlaceDetailsModal
          isOpen={showPlaceDetails}
          onClose={() => {
            setShowPlaceDetails(false);
            setSelectedPlace(null);
          }}
          place={selectedPlace}
          currentUser={currentUser}
          onPlaceUpdate={loadAllPlaces}
        />
      )}
    </>
  );
};

export default MapView;