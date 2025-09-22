import React, { useState, useEffect } from 'react';
import type { TripEvent } from '../../types';
import { api } from '../../services/api';

interface EventLocation {
  name: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}


interface JourneyMapProps {
  title?: string;
  events?: TripEvent[];
}

export function JourneyMap({ title = 'Our Journey', events = [] }: JourneyMapProps) {
  const [mapImageUrl, setMapImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<EventLocation[]>([]);
  const [geocodingCache, setGeocodingCache] = useState<Record<string, any>>({});

  // Load cache from D1 database for events
  const loadCacheFromDatabase = async (eventsWithLocations: Array<{id: string; location: string}>): Promise<Record<string, any>> => {
    if (eventsWithLocations.length === 0) return {};
    
    try {
      const eventIds = eventsWithLocations.map(e => e.id);
      console.log('JourneyMap: Loading cache from D1 for events:', eventIds);
      const cache = await api.getEventGeocodingCache(eventIds) as Record<string, any>;
      console.log('JourneyMap: Loaded cache from D1:', cache);
      return cache || {};
    } catch (error) {
      console.warn('Failed to load event geocoding cache from database:', error);
      return {};
    }
  };

  // Save geocoding results to D1 database
  const saveCacheToDatabase = async (geocodingResults: Array<{
    eventId: string;
    locationName: string;
    coordinates?: { lat: number; lon: number };
    status: 'success' | 'not_found' | 'outside_bounds';
    formattedAddress?: string;
    countryCode?: string;
  }>) => {
    try {
      console.log('JourneyMap: Saving event geocoding results to D1:', geocodingResults);
      
      // Debug each result to see if eventId is valid
      geocodingResults.forEach((result, index) => {
        console.log(`JourneyMap: Result ${index}:`, {
          eventId: result.eventId,
          eventIdType: typeof result.eventId,
          locationName: result.locationName,
          status: result.status,
          hasCoordinates: !!result.coordinates,
          formattedAddress: result.formattedAddress,
          countryCode: result.countryCode
        });
      });
      
      const result = await api.storeEventGeocodingResults(geocodingResults);
      console.log('JourneyMap: Successfully saved to D1 cache, result:', result);
    } catch (error) {
      console.error('Failed to save event geocoding cache to database:', error);
      
      // Try to get more details from the error
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      // Don't throw the error - allow the map to continue working without cache
      console.warn('Continuing without caching geocoding results');
    }
  };

  // Extract events with locations
  const eventsWithLocations = React.useMemo(() => {
    const eventLocations: Array<{id: string; location: string; name: string}> = [];
    
    console.log('JourneyMap: Processing events:', events.length);
    
    events.forEach(event => {
      console.log('Event:', {
        id: event.id,
        idType: typeof event.id,
        name: event.name,
        location: event.location
      });
      
      if (event.location && event.location.trim() && event.location !== 'Add location') {
        if (!event.id) {
          console.error('JourneyMap: Event has no ID!', event);
          return; // Skip events without IDs
        }
        
        eventLocations.push({
          id: event.id,
          location: event.location.trim(),
          name: event.name
        });
      }
    });
    
    console.log('JourneyMap: Events with locations found:', eventLocations);
    return eventLocations;
  }, [events]);

  // Geocode locations and generate map
  useEffect(() => {
    if (eventsWithLocations.length === 0) {
      setMapImageUrl('');
      setLocations([]);
      return;
    }

    const geocodeAndGenerateMap = async () => {
      console.log('JourneyMap: Starting geocoding for events:', eventsWithLocations);
      setIsLoading(true);
      const geocodedLocations: EventLocation[] = [];
      const newGeocodingResults: Array<{
        eventId: string;
        locationName: string;
        coordinates?: { lat: number; lon: number };
        status: 'success' | 'not_found' | 'outside_bounds';
        formattedAddress?: string;
        countryCode?: string;
      }> = [];
      
      try {
        // Load cache from D1 database for all events with locations
        const dbCache = await loadCacheFromDatabase(eventsWithLocations);
        setGeocodingCache(dbCache);
        console.log('JourneyMap: Loaded D1 cache:', dbCache);
        
        // Geocode each event's location
        for (const eventLocation of eventsWithLocations) {
          // Check D1 cache first (by event ID)
          const cached = dbCache[eventLocation.id];
          
          if (cached && cached.coordinates) {
            console.log(`JourneyMap: Using D1 cached coordinates for event "${eventLocation.name}" (${eventLocation.location}):`, cached.coordinates);
            geocodedLocations.push({
              name: eventLocation.location,
              coordinates: cached.coordinates
            });
            continue;
          } else if (cached && cached.status !== 'success') {
            console.log(`JourneyMap: Event "${eventLocation.name}" location cached as ${cached.status}, skipping geocoding`);
            continue;
          }
          
          console.log(`JourneyMap: Geocoding "${eventLocation.location}" for event "${eventLocation.name}" (not in D1 cache)`);
          try {
            const response = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(eventLocation.location)}&bias=countrycode:ch&limit=1&apiKey=02e88c55f4b445fdaad08a07c030fd74`);
            const data = await response.json() as { features?: any[] };
            
            console.log(`JourneyMap: Geocoding response for "${eventLocation.location}":`, data);
            
            if (data.features && data.features.length > 0) {
              const feature = data.features[0];
              if (feature.geometry && feature.geometry.coordinates) {
                const coordinates = {
                  lon: feature.geometry.coordinates[0],
                  lat: feature.geometry.coordinates[1]
                };
                
                const properties = feature.properties || {};
                const formattedAddress = properties.formatted || '';
                const countryCode = properties.country_code || '';
                
                // Only include coordinates that are roughly in Switzerland/Europe area
                // Switzerland bounds: roughly 5.96-10.49 longitude, 45.82-47.81 latitude
                const isInSwitzerlandArea = 
                  coordinates.lat >= 45 && coordinates.lat <= 48 &&
                  coordinates.lon >= 5 && coordinates.lon <= 11;
                
                if (isInSwitzerlandArea) {
                  console.log(`JourneyMap: Found valid Swiss coordinates for "${eventLocation.location}":`, coordinates);
                  geocodedLocations.push({
                    name: eventLocation.location,
                    coordinates
                  });
                  
                  // Prepare for D1 cache storage (event-specific)
                  newGeocodingResults.push({
                    eventId: eventLocation.id,
                    locationName: eventLocation.location,
                    coordinates,
                    status: 'success' as const,
                    formattedAddress: formattedAddress || undefined,
                    countryCode: countryCode || undefined
                  });
                } else {
                  console.log(`JourneyMap: Rejected coordinates outside Switzerland for "${eventLocation.location}":`, coordinates);
                  // Cache the rejection (coordinates outside bounds)
                  newGeocodingResults.push({
                    eventId: eventLocation.id,
                    locationName: eventLocation.location,
                    status: 'outside_bounds' as const,
                    formattedAddress: formattedAddress || undefined,
                    countryCode: countryCode || undefined
                  });
                }
              } else {
                console.log(`JourneyMap: No coordinates found for "${eventLocation.location}"`);
                // Cache the no-coordinates result
                newGeocodingResults.push({
                  eventId: eventLocation.id,
                  locationName: eventLocation.location,
                  status: 'not_found' as const,
                  formattedAddress: undefined,
                  countryCode: undefined
                });
              }
            } else {
              console.log(`JourneyMap: No features found for "${eventLocation.location}"`);
              // Cache the no-features result
              newGeocodingResults.push({
                eventId: eventLocation.id,
                locationName: eventLocation.location,
                status: 'not_found' as const,
                formattedAddress: undefined,
                countryCode: undefined
              });
            }
          } catch (error) {
            console.error(`Failed to geocode ${eventLocation.location}:`, error);
            // Don't cache API errors, but add location without coordinates
            geocodedLocations.push({
              name: eventLocation.location
            });
          }
        }
        
        // Save new geocoding results to D1 database
        if (newGeocodingResults.length > 0) {
          await saveCacheToDatabase(newGeocodingResults);
          console.log('JourneyMap: Saved new geocoding results to D1 cache');
        }

        console.log('JourneyMap: All geocoded locations:', geocodedLocations);
        setLocations(geocodedLocations);

        // Generate static map URL
        if (geocodedLocations.some(loc => loc.coordinates)) {
          const validLocations = geocodedLocations.filter(loc => loc.coordinates);
          console.log('JourneyMap: Valid locations with coordinates:', validLocations);
          
          if (validLocations.length > 0) {
            // Calculate bounds of all locations
            const lats = validLocations.map(loc => loc.coordinates!.lat);
            const lons = validLocations.map(loc => loc.coordinates!.lon);
            
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);
            
            // Calculate center point
            const centerLat = (minLat + maxLat) / 2;
            const centerLon = (minLon + maxLon) / 2;

            // Calculate the span to determine appropriate zoom
            const latSpan = maxLat - minLat;
            const lonSpan = maxLon - minLon;
            const maxSpan = Math.max(latSpan, lonSpan);

            console.log('JourneyMap: Location bounds:', { minLat, maxLat, minLon, maxLon });
            console.log('JourneyMap: Center:', { centerLat, centerLon });
            console.log('JourneyMap: Span:', { latSpan, lonSpan, maxSpan });

            // Create markers string
            const markersParams = validLocations.map((loc, index) => {
              const colors = ['%23bb3f73', '%234c905a', '%23e32020', '%233b82f6', '%23f59e0b', '%238b5cf6'];
              const color = colors[index % colors.length];
              const marker = `lonlat%3A${loc.coordinates!.lon}%2C${loc.coordinates!.lat}%3Btype%3Amaterial%3Bcolor%3A${color}%3Bsize%3Ax-large`;
              console.log(`JourneyMap: Marker for "${loc.name}":`, marker);
              return marker;
            }).join('%7C');

            // Smart zoom calculation based on the geographical span (moderate zoom)
            let zoom;
            if (validLocations.length === 1) {
              zoom = 10; // Close zoom for single location
            } else if (maxSpan > 10) {
              zoom = 4; // Very wide spread - country/continent level
            } else if (maxSpan > 5) {
              zoom = 5; // Large region
            } else if (maxSpan > 2) {
              zoom = 6; // Medium region
            } else if (maxSpan > 1) {
              zoom = 7; // Small region
            } else if (maxSpan > 0.5) {
              zoom = 8; // City level
            } else {
              zoom = 9; // Very close locations
            }

            const apiKey = '02e88c55f4b445fdaad08a07c030fd74';
            
            console.log('JourneyMap: Calculated zoom:', zoom);

            // TEMPORARY: Test with known Swiss coordinates to verify map works
            const testMode = false;
            let finalCenterLat, finalCenterLon, finalZoom, finalMarkers;
            
            if (testMode) {
              // Test coordinates for major Swiss cities
              finalCenterLat = 46.8182; // Switzerland center
              finalCenterLon = 8.2275;
              finalZoom = 7;
              finalMarkers = 'lonlat%3A8.5417%2C47.3769%3Btype%3Amaterial%3Bcolor%3A%23bb3f73%3Bsize%3Ax-large%7Clonlat%3A8.3093%2C47.0502%3Btype%3Amaterial%3Bcolor%3A%234c905a%3Bsize%3Ax-large%7Clonlat%3A7.4474%2C46.9480%3Btype%3Amaterial%3Bcolor%3A%23e32020%3Bsize%3Ax-large';
              console.log('JourneyMap: Using TEST MODE with Swiss cities');
            } else {
              finalCenterLat = centerLat;
              finalCenterLon = centerLon;
              finalZoom = zoom;
              finalMarkers = markersParams;
            }

            const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=1200&height=500&center=lonlat%3A${finalCenterLon}%2C${finalCenterLat}&zoom=${finalZoom}&marker=${finalMarkers}&apiKey=${apiKey}`;
            
            console.log('JourneyMap: Generated map URL:', mapUrl);
            setMapImageUrl(mapUrl);
          } else {
            console.log('JourneyMap: No valid locations found for map generation');
          }
        } else {
          console.log('JourneyMap: No geocoded locations found');
        }
      } catch (error) {
        console.error('Failed to generate map:', error);
      } finally {
        setIsLoading(false);
      }
    };

    geocodeAndGenerateMap();
  }, [eventsWithLocations]);

  if (eventsWithLocations.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-display font-medium text-stone-900 mb-3">{title}</h3>
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 h-64 lg:h-80 border border-stone-forest/30 shadow-sm mb-4 lg:mb-4">
          <div className="relative w-full h-full bg-gradient-to-br from-stone-forest/30 to-stone-forest/40 rounded-xl overflow-hidden flex items-center justify-center">
            <div className="text-stone-forest text-center">
              <div className="text-sm font-medium">No locations found</div>
              <div className="text-xs mt-1 opacity-70">Add locations to your events to see them on the map</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-display font-medium text-stone-900 mb-3">{title}</h3>
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 h-64 lg:h-80 border border-stone-forest/30 shadow-sm mb-4 lg:mb-4">
        <div className="relative w-full h-full rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full bg-gradient-to-br from-stone-forest/30 to-stone-forest/40 flex items-center justify-center">
              <div className="text-stone-forest text-center">
                <div className="w-6 h-6 border-2 border-stone-forest border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-xs">Loading map...</div>
              </div>
            </div>
          ) : mapImageUrl ? (
            <img 
              src={mapImageUrl} 
              alt="Journey Map" 
              className="w-full h-full object-cover"
              onError={() => setMapImageUrl('')}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-forest/30 to-stone-forest/40 flex items-center justify-center">
              <div className="text-stone-forest text-center">
                <div className="text-xs font-medium mb-2">JOURNEY LOCATIONS</div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {locations.map((location) => (
                    <div key={location.name} className="flex items-center justify-center">
                      <div className="w-2 h-2 bg-stone-forest rounded-full mr-2 shadow-sm"></div>
                      <span className="text-xs">{location.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}