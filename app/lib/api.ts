interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    CACHE: KVNamespace;
    REALTIME: KVNamespace;
    GEOAPIFY_API_KEY?: string;
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Simple authentication - just check user ID and password
async function authenticate(userId: string, password: string, env: Env) {
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? AND password = ?')
        .bind(userId, password)
        .first();
    
    return user ? { userId: user.id as string } : null;
}

// Convert file to base64 for temporary display
async function fileToBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response | null> {
    const url = new URL(request.url);
    console.log(`API REQUEST: ${request.method} ${url.pathname}`);
    
    // Only handle API routes
    if (!url.pathname.startsWith('/api/')) {
        return null;
    }
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
        // Test route
        if (url.pathname === '/api/test') {
            return new Response(JSON.stringify({ message: 'API is working!' }), {
                headers: corsHeaders
            });
        }
        
        // Login route
        if (url.pathname === '/api/auth/login' && request.method === 'POST') {
            const { userId, password } = await request.json() as { userId: string; password: string };
            
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            return new Response(JSON.stringify({
                success: true,
                user: { userId: user.userId, name: user.userId }
            }), {
                headers: corsHeaders
            });
        }
        
        // Register route
        if (url.pathname === '/api/auth/register' && request.method === 'POST') {
            const { userId, password } = await request.json() as { userId: string; password: string };
            
            // Check if user already exists
            const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
                .bind(userId)
                .first();

            if (existing) {
                return new Response(JSON.stringify({ error: 'User already exists' }), { 
                    status: 409, 
                    headers: corsHeaders
                });
            }

            // Create user
            await env.DB.prepare('INSERT INTO users (id, password) VALUES (?, ?)')
                .bind(userId, password)
                .run();

            return new Response(JSON.stringify({ message: 'User created successfully' }), {
                headers: corsHeaders
            });
        }
        
        // Albums route
        if (url.pathname === '/api/albums' && request.method === 'POST') {
            console.log('TEST LOG: Albums endpoint called');
            const { userId, password } = await request.json() as { userId: string; password: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            const albums = await env.DB.prepare(`
                SELECT a.* 
                FROM albums a 
                JOIN album_participants ap ON a.id = ap.album_id 
                WHERE ap.user_id = ?
            `).bind(user.userId).all();

            return new Response(JSON.stringify(albums.results), {
                headers: corsHeaders
            });
        }
        
        // Full album data route
        if (url.pathname.match(/\/api\/albums\/([^\/]+)\/full$/) && request.method === 'POST') {
            const albumId = url.pathname.split('/')[3];
            const { userId, password } = await request.json() as { userId: string; password: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            // Get album info
            const album = await env.DB.prepare(`
                SELECT a.* 
                FROM albums a 
                JOIN album_participants ap ON a.id = ap.album_id 
                WHERE a.id = ? AND ap.user_id = ?
            `).bind(albumId, user.userId).first();

            if (!album) {
                return new Response(JSON.stringify({ error: 'Album not found or access denied' }), { 
                    status: 404, 
                    headers: corsHeaders
                });
            }

            // Get trip days
            const days = await env.DB.prepare(`
                SELECT * FROM trip_days 
                WHERE album_id = ? 
                ORDER BY sort_order
            `).bind(albumId).all();

            // Get events with participants and media
            const events = await env.DB.prepare(`
                SELECT e.*, 
                       GROUP_CONCAT(ep.user_id) as participant_ids
                FROM events e
                LEFT JOIN event_participants ep ON e.id = ep.event_id
                WHERE e.trip_day_id IN (SELECT id FROM trip_days WHERE album_id = ?)
                GROUP BY e.id
                ORDER BY e.trip_day_id, e.sort_order
            `).bind(albumId).all();
            
            // Get media for all events with uploader info
            const media = await env.DB.prepare(`
                SELECT em.*, e.trip_day_id, em.uploaded_by as uploader_id
                FROM event_media em
                JOIN events e ON em.event_id = e.id
                WHERE e.trip_day_id IN (SELECT id FROM trip_days WHERE album_id = ?)
                ORDER BY em.created_at ASC
            `).bind(albumId).all();

            // Get album participants
            const participants = await env.DB.prepare(`
                SELECT user_id FROM album_participants 
                WHERE album_id = ?
            `).bind(albumId).all();

            // Format the data with media
            const formattedDays = days.results?.map((day: any) => {
                const dayEvents = events.results?.filter((event: any) => event.trip_day_id === day.id) || [];
                
                // Count photos for this day
                const dayMediaCount = media.results?.filter((m: any) => 
                    dayEvents.some((e: any) => e.id === m.event_id)
                ).length || 0;
                
                return {
                    id: day.id,
                    date: day.date,
                    title: day.title,
                    heroPhoto: day.hero_photo_url || "https://picsum.photos/800/600?random=1",
                    photoCount: dayMediaCount,
                    backgroundColor: day.background_color || "bg-blue-100",
                    events: dayEvents.map((event: any) => {
                        // Get media for this event
                        const eventMedia = media.results?.filter((m: any) => m.event_id === event.id) || [];
                        const photos: any[] = [];
                        const videos: any[] = [];
                        
                        eventMedia.forEach((m: any) => {
                            // Ensure we use the correct API URL format for media
                            if (m.media_url) {
                                // If the stored URL is already in API format, use it
                                // Otherwise, construct the API URL using the media ID
                                let mediaUrl = m.media_url;
                                if (!mediaUrl.startsWith('/api/media/')) {
                                    mediaUrl = `/api/media/${m.id}`;
                                }
                                
                                const mediaItem = {
                                    url: mediaUrl,
                                    uploader: {
                                        id: m.uploader_id,
                                        name: m.uploader_id,
                                        avatar: `https://picsum.photos/80/80?random=${m.uploader_id.length}`
                                    }
                                };
                                
                                if (m.media_type === 'video') {
                                    videos.push(mediaItem);
                                } else {
                                    photos.push(mediaItem);
                                }
                            }
                        });
                        
                        return {
                            id: event.id,
                            name: event.name,
                            description: event.description,
                            location: event.location,
                            emoji: event.emoji,
                            photos,
                            videos,
                            participants: event.participant_ids 
                                ? event.participant_ids.split(',').map((userId: string) => ({
                                    id: userId.trim(),
                                    name: userId.trim(),
                                    avatar: `https://picsum.photos/80/80?random=${userId.trim().length}`
                                }))
                                : []
                        };
                    })
                };
            }) || [];

            // Get all album participants with profiles
            const albumParticipants = participants.results?.map((p: any) => ({
                id: p.user_id,
                name: p.user_id,
                avatar: `https://picsum.photos/80/80?random=${p.user_id.length}`
            })) || [];

            const result = {
                album: {
                    id: album.id,
                    title: album.title,
                    description: album.description
                },
                participants: albumParticipants,
                days: formattedDays
            };

            return new Response(JSON.stringify(result), {
                headers: corsHeaders
            });
        }
        
        // Event geocoding cache - get cached locations for events
        if (url.pathname === '/api/events/geocoding-cache' && request.method === 'POST') {
            const { userId, password, eventIds } = await request.json() as { userId: string; password: string; eventIds: string[] };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            try {
                // Get cached locations from database for the given events
                if (!eventIds || eventIds.length === 0) {
                    return new Response(JSON.stringify({}), {
                        headers: corsHeaders
                    });
                }
                
                // Use placeholders for the IN clause
                const placeholders = eventIds.map(() => '?').join(', ');
                const cachedResults = await env.DB.prepare(`
                    SELECT event_id, location_name, latitude, longitude, status, created_at
                    FROM event_geocoding_cache 
                    WHERE event_id IN (${placeholders})
                `).bind(...eventIds).all();

                // Format results as an object map by event_id
                const cache: Record<string, any> = {};
                cachedResults.results?.forEach((row: any) => {
                    cache[row.event_id] = {
                        locationName: row.location_name,
                        coordinates: row.latitude && row.longitude ? {
                            lat: row.latitude,
                            lon: row.longitude
                        } : null,
                        status: row.status,
                        timestamp: new Date(row.created_at).getTime()
                    };
                });

                return new Response(JSON.stringify(cache), {
                    headers: corsHeaders
                });
            } catch (error) {
                console.error('Event geocoding cache error:', error);
                return new Response(JSON.stringify({ error: 'Cache lookup failed' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Event geocoding cache - store geocoded results for events
        if (url.pathname === '/api/events/geocoding-cache' && request.method === 'PUT') {
            console.log('=== GEOCODING CACHE STORAGE API CALLED ===');
            const { userId, password, geocodingResults } = await request.json() as { 
                userId: string; 
                password: string; 
                geocodingResults: Array<{
                    eventId: string;
                    locationName: string;
                    coordinates?: { lat: number; lon: number };
                    status: 'success' | 'not_found' | 'outside_bounds';
                    formattedAddress?: string;
                    countryCode?: string;
                }>
            };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            try {
                const now = new Date().toISOString();
                
                for (const result of geocodingResults) {
                    try {
                        console.log('Storing geocoding result:', {
                            eventId: result.eventId,
                            locationName: result.locationName,
                            status: result.status,
                            coordinates: result.coordinates
                        });
                        
                        // Very defensive value preparation - ensure NO undefined values
                        const eventId = result.eventId || null;
                        const locationName = result.locationName || null;
                        const latitude = (result.coordinates && typeof result.coordinates.lat === 'number') ? result.coordinates.lat : null;
                        const longitude = (result.coordinates && typeof result.coordinates.lon === 'number') ? result.coordinates.lon : null;
                        const countryCode = result.countryCode || null;
                        const formattedAddress = result.formattedAddress || null;
                        const status = result.status || 'not_found';
                        
                        // Debug log the individual values
                        console.log(`Processing event ${result.eventId}:`, {
                            eventId: eventId,
                            locationName: locationName,
                            latitude: latitude,
                            longitude: longitude,
                            countryCode: countryCode,
                            formattedAddress: formattedAddress,
                            status: status,
                            hasCoordinates: !!result.coordinates
                        });
                        
                        // Final safety check - convert any remaining undefined to null
                        const values = [eventId, locationName, latitude, longitude, countryCode, formattedAddress, status, now, now].map(v => 
                            v === undefined ? null : v
                        );
                        
                        // Use INSERT OR REPLACE to handle conflicts
                        await env.DB.prepare(`
                            INSERT OR REPLACE INTO event_geocoding_cache (
                                event_id,
                                location_name, 
                                latitude, 
                                longitude, 
                                country_code,
                                formatted_address,
                                status, 
                                created_at, 
                                updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).bind(...values).run();
                        
                        console.log('Successfully stored geocoding result for event:', result.eventId);
                    } catch (dbError) {
                        console.error('Failed to store individual geocoding result:', {
                            eventId: result.eventId,
                            error: dbError,
                            errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error'
                        });
                        throw dbError; // Re-throw to trigger the outer catch
                    }
                }

                console.log('Successfully stored all geocoding results, count:', geocodingResults.length);
                return new Response(JSON.stringify({ success: true, cached: geocodingResults.length }), {
                    headers: corsHeaders
                });
            } catch (error) {
                console.error('Event geocoding cache storage error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                
                // Check if it's a D1 type error
                if (errorMessage.includes('D1_TYPE_ERROR')) {
                    return new Response(JSON.stringify({ 
                        error: 'Database error', 
                        details: errorMessage 
                    }), { 
                        status: 500, 
                        headers: corsHeaders
                    });
                }
                
                return new Response(JSON.stringify({ 
                    error: 'Cache storage failed', 
                    details: errorMessage 
                }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Update event
        if (url.pathname.match(/\/api\/events\/([^\/]+)$/) && request.method === 'PUT') {
            const eventId = url.pathname.split('/')[3];
            const { userId, password, name, description, emoji, location } = await request.json() as { userId: string; password: string; name: string; description: string; emoji: string; location: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            try {
                // Convert all undefined values to null for D1 compatibility
                const cleanName = name === undefined ? null : name;
                const cleanDescription = description === undefined ? null : description;
                const cleanEmoji = emoji === undefined ? null : emoji;
                const cleanLocation = location === undefined ? null : location;
                const cleanEventId = eventId === undefined ? null : eventId;
                
                // Get the current event to check if location is changing
                const currentEvent = await env.DB.prepare(`
                    SELECT location FROM events WHERE id = ?
                `).bind(cleanEventId).first();
                
                await env.DB.prepare(`
                    UPDATE events 
                    SET name = ?, description = ?, emoji = ?, location = ?
                    WHERE id = ?
                `).bind(cleanName, cleanDescription, cleanEmoji, cleanLocation, cleanEventId).run();
                
                // If location changed, invalidate the geocoding cache and re-geocode new location
                if (currentEvent && currentEvent.location !== cleanLocation && cleanLocation) {
                    console.log('Location changed for event', cleanEventId, 'from', currentEvent.location, 'to', cleanLocation);
                    await env.DB.prepare(`
                        DELETE FROM event_geocoding_cache WHERE event_id = ?
                    `).bind(cleanEventId).run();
                    console.log('Invalidated geocoding cache for event:', cleanEventId);
                    
                    // Geocode the new location immediately
                    try {
                        const geocodeResponse = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(cleanLocation)}&bias=countrycode:ch&limit=1&apiKey=02e88c55f4b445fdaad08a07c030fd74`);
                        const geocodeData = await geocodeResponse.json() as any;
                        
                        console.log(`Geocoding new location "${cleanLocation}" for event ${cleanEventId}`);
                        
                        if (geocodeData.features && geocodeData.features.length > 0) {
                            const feature = geocodeData.features[0];
                            if (feature.geometry && feature.geometry.coordinates) {
                                const coordinates = {
                                    lon: feature.geometry.coordinates[0],
                                    lat: feature.geometry.coordinates[1]
                                };
                                
                                const properties = feature.properties || {};
                                const formattedAddress = properties.formatted || '';
                                const countryCode = properties.country_code || '';
                                
                                // Check if coordinates are in Switzerland area
                                const isInSwitzerlandArea = 
                                    coordinates.lat >= 45 && coordinates.lat <= 48 &&
                                    coordinates.lon >= 5 && coordinates.lon <= 11;
                                
                                if (isInSwitzerlandArea) {
                                    console.log(`Found valid Swiss coordinates for "${cleanLocation}":`, coordinates);
                                    
                                    // Store new geocoding result in cache
                                    const now = new Date().toISOString();
                                    const values = [cleanEventId, cleanLocation, coordinates.lat, coordinates.lon, countryCode, formattedAddress, 'success', now, now].map(v => 
                                        v === undefined ? null : v
                                    );
                                    
                                    await env.DB.prepare(`
                                        INSERT INTO event_geocoding_cache (
                                            event_id,
                                            location_name, 
                                            latitude, 
                                            longitude, 
                                            country_code,
                                            formatted_address,
                                            status, 
                                            created_at, 
                                            updated_at
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                    `).bind(...values).run();
                                    
                                    console.log('Stored new geocoding result for updated location:', cleanEventId);
                                } else {
                                    console.log(`Coordinates outside Switzerland for "${cleanLocation}":`, coordinates);
                                    // Store as outside bounds
                                    const now = new Date().toISOString();
                                    const values = [cleanEventId, cleanLocation, null, null, countryCode, formattedAddress, 'outside_bounds', now, now];
                                    
                                    await env.DB.prepare(`
                                        INSERT INTO event_geocoding_cache (
                                            event_id,
                                            location_name, 
                                            latitude, 
                                            longitude, 
                                            country_code,
                                            formatted_address,
                                            status, 
                                            created_at, 
                                            updated_at
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                    `).bind(...values).run();
                                }
                            } else {
                                console.log(`No coordinates found for "${cleanLocation}"`);
                                // Store as not found
                                const now = new Date().toISOString();
                                const values = [cleanEventId, cleanLocation, null, null, null, null, 'not_found', now, now];
                                
                                await env.DB.prepare(`
                                    INSERT INTO event_geocoding_cache (
                                        event_id,
                                        location_name, 
                                        latitude, 
                                        longitude, 
                                        country_code,
                                        formatted_address,
                                        status, 
                                        created_at, 
                                        updated_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `).bind(...values).run();
                            }
                        } else {
                            console.log(`No geocoding results for "${cleanLocation}"`);
                            // Store as not found
                            const now = new Date().toISOString();
                            const values = [cleanEventId, cleanLocation, null, null, null, null, 'not_found', now, now];
                            
                            await env.DB.prepare(`
                                INSERT INTO event_geocoding_cache (
                                    event_id,
                                    location_name, 
                                    latitude, 
                                    longitude, 
                                    country_code,
                                    formatted_address,
                                    status, 
                                    created_at, 
                                    updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).bind(...values).run();
                        }
                    } catch (geocodeError) {
                        console.error('Failed to geocode new location:', geocodeError);
                        // Don't fail the event update if geocoding fails
                    }
                }
                
                return new Response(JSON.stringify({ success: true }), {
                    headers: corsHeaders
                });
            } catch (dbError) {
                console.error('Database error updating event:', dbError);
                return new Response(JSON.stringify({ error: 'Database error', details: dbError instanceof Error ? dbError.message : 'Unknown error' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Add new event
        if (url.pathname === '/api/events' && request.method === 'POST') {
            const { userId, password, tripDayId, name, description, emoji, location, sortOrder, participantIds } = await request.json() as { userId: string; password: string; tripDayId: string; name: string; description: string; emoji: string; location: string; sortOrder: number; participantIds: string[] };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            const eventId = `event-${Date.now()}`;
            
            try {
                // Convert all undefined values to null for D1 compatibility
                const cleanEventId = eventId === undefined ? null : eventId;
                const cleanTripDayId = tripDayId === undefined ? null : tripDayId;
                const cleanName = name === undefined ? null : name;
                const cleanDescription = description === undefined ? null : description;
                const cleanEmoji = emoji === undefined ? null : emoji;
                const cleanLocation = location === undefined ? null : location;
                const cleanSortOrder = sortOrder === undefined ? null : sortOrder;
                
                // Create the event
                await env.DB.prepare(`
                    INSERT INTO events (id, trip_day_id, name, description, emoji, location, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(cleanEventId, cleanTripDayId, cleanName, cleanDescription, cleanEmoji, cleanLocation, cleanSortOrder).run();
                
                // Add participants if provided
                if (participantIds && Array.isArray(participantIds)) {
                    for (const participantId of participantIds) {
                        await env.DB.prepare(`
                            INSERT INTO event_participants (event_id, user_id)
                            VALUES (?, ?)
                        `).bind(eventId, participantId).run();
                    }
                }
                
                return new Response(JSON.stringify({ success: true, eventId }), {
                    headers: corsHeaders
                });
            } catch (dbError) {
                console.error('Database error creating event:', dbError);
                return new Response(JSON.stringify({ error: 'Database error', details: dbError instanceof Error ? dbError.message : 'Unknown error' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Delete event
        if (url.pathname.match(/\/api\/events\/([^\/]+)$/) && request.method === 'DELETE') {
            const eventId = url.pathname.split('/')[3];
            const { userId, password } = await request.json() as { userId: string; password: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(eventId).run();

            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders
            });
        }
        
        // Update day
        if (url.pathname.match(/\/api\/trip-days\/([^\/]+)$/) && request.method === 'PUT') {
            const dayId = url.pathname.split('/')[3];
            const { userId, password, title, date } = await request.json() as { userId: string; password: string; title: string; date: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            // Get the album_id for this day
            const dayInfo = await env.DB.prepare('SELECT album_id FROM trip_days WHERE id = ?').bind(dayId).first();
            if (!dayInfo) {
                return new Response(JSON.stringify({ error: 'Day not found' }), { 
                    status: 404, 
                    headers: corsHeaders
                });
            }

            // Update the day's title and date
            await env.DB.prepare(`
                UPDATE trip_days 
                SET title = ?, date = ?
                WHERE id = ?
            `).bind(title, date, dayId).run();

            // Get all days in this album 
            const allDays = await env.DB.prepare(`
                SELECT id, date FROM trip_days 
                WHERE album_id = ?
            `).bind((dayInfo as any).album_id).all();

            // Sort days chronologically by parsing dates properly
            const sortedDays = (allDays.results || []).sort((a: any, b: any) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA.getTime() - dateB.getTime();
            });

            // Update sort_order for all days to maintain chronological order
            for (let i = 0; i < sortedDays.length; i++) {
                const day = sortedDays[i] as any;
                await env.DB.prepare(`
                    UPDATE trip_days 
                    SET sort_order = ?
                    WHERE id = ?
                `).bind(i + 1, day.id).run();
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders
            });
        }
        
        // Create new day
        if (url.pathname === '/api/trip-days' && request.method === 'POST') {
            const { userId, password, albumId, title, date } = await request.json() as { userId: string; password: string; albumId: string; title: string; date: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            const dayId = `day-${Date.now()}`;
            
            // Insert the new day with a temporary sort_order
            await env.DB.prepare(`
                INSERT INTO trip_days (id, album_id, title, date, sort_order, background_color)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(dayId, albumId, title, date, 999, 'bg-blue-100').run();

            // Get all days in this album
            const allDays = await env.DB.prepare(`
                SELECT id, date FROM trip_days 
                WHERE album_id = ?
            `).bind(albumId).all();

            // Sort days chronologically by parsing dates properly
            const sortedDays = (allDays.results || []).sort((a: any, b: any) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA.getTime() - dateB.getTime();
            });

            // Update sort_order for all days to maintain chronological order
            for (let i = 0; i < sortedDays.length; i++) {
                const day = sortedDays[i] as any;
                await env.DB.prepare(`
                    UPDATE trip_days 
                    SET sort_order = ?
                    WHERE id = ?
                `).bind(i + 1, day.id).run();
            }

            return new Response(JSON.stringify({ success: true, dayId }), {
                headers: corsHeaders
            });
        }
        
        // Delete day
        if (url.pathname.match(/\/api\/trip-days\/([^\/]+)$/) && request.method === 'DELETE') {
            const dayId = url.pathname.split('/')[3];
            const { userId, password } = await request.json() as { userId: string; password: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            // Check if day has any events
            const eventCount = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM events WHERE trip_day_id = ?
            `).bind(dayId).first();

            if (eventCount && (eventCount as any).count > 0) {
                return new Response(JSON.stringify({ error: 'Cannot delete day with events' }), { 
                    status: 400, 
                    headers: corsHeaders
                });
            }

            // Delete the day
            await env.DB.prepare('DELETE FROM trip_days WHERE id = ?').bind(dayId).run();

            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders
            });
        }
        
        // Add/remove event participants
        if (url.pathname.match(/\/api\/events\/([^\/]+)\/participants$/) && request.method === 'POST') {
            const eventId = url.pathname.split('/')[3];
            const { userId, password, participantId, action } = await request.json() as { userId: string; password: string; participantId: string; action: string }; // action: 'add' or 'remove'
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            if (action === 'add') {
                await env.DB.prepare(`
                    INSERT OR IGNORE INTO event_participants (event_id, user_id)
                    VALUES (?, ?)
                `).bind(eventId, participantId).run();
            } else if (action === 'remove') {
                await env.DB.prepare(`
                    DELETE FROM event_participants 
                    WHERE event_id = ? AND user_id = ?
                `).bind(eventId, participantId).run();
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: corsHeaders
            });
        }
        
        // Upload media to event
        if (url.pathname === '/api/media/upload' && request.method === 'POST') {
            try {
                const formData = await request.formData();
                const userId = formData.get('userId') as string;
                const password = formData.get('password') as string;
                const eventId = formData.get('eventId') as string;
                const files = formData.getAll('files') as File[];
                
                const user = await authenticate(userId, password, env);
                
                if (!user) {
                    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                        status: 401, 
                        headers: corsHeaders
                    });
                }

                const uploadedFiles = [];

                for (const file of files) {
                    
                    // Get album_id for the event
                    const eventInfo = await env.DB.prepare(`
                        SELECT td.album_id 
                        FROM events e
                        JOIN trip_days td ON e.trip_day_id = td.id 
                        WHERE e.id = ?
                    `).bind(eventId).first();
                    
                    if (!eventInfo) {
                        throw new Error('Event not found');
                    }
                    
                    const albumId = (eventInfo as any).album_id;
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
                    const randomId = Math.random().toString(36).substring(2, 11);
                    let fileExtension = file.name.split('.').pop();
                    const mediaType = file.type.startsWith('video/') ? 'videos' : 'photos';
                    
                    // Ensure video files have .mp4 extension (converted files should already have this)
                    if (file.type.startsWith('video/') && file.type !== 'video/mp4') {
                        fileExtension = 'mp4';
                    }
                    
                    // Structure: /albums/{album_id}/media/{photos|videos}/{event_id}/{timestamp}_{random_id}.{ext}
                    const fileName = `albums/${albumId}/media/${mediaType}/${eventId}/${timestamp}_${randomId}.${fileExtension}`;
                    
                    let fileUrl = '';
                    let uploadSuccess = false;
                    
                    // Try to upload to R2 first
                    try {
                        
                        // Convert File to ArrayBuffer for R2
                        const arrayBuffer = await file.arrayBuffer();
                        
                        // Upload to R2 with proper options
                        // Ensure proper content type for converted videos
                        const contentType = file.type.startsWith('video/') && fileExtension === 'mp4' 
                            ? 'video/mp4' 
                            : file.type;
                            
                        const r2Object = await env.BUCKET.put(fileName, arrayBuffer, {
                            httpMetadata: {
                                contentType: contentType,
                                contentDisposition: `inline; filename="${file.name}"`
                            },
                            customMetadata: {
                                originalName: file.name,
                                uploadedAt: new Date().toISOString(),
                                eventId: eventId,
                                fileSize: file.size.toString()
                            }
                        });
                        
                        if (r2Object) {
                            uploadSuccess = true;
                            
                            // Save media info to database with R2 key for direct access
                            const mediaId = `media-${timestamp}_${randomId}`;
                            const mediaUrl = `/api/media/${mediaId}`;
                            const mediaType = file.type.startsWith('video/') ? 'video' : 'photo';
                            const sortOrder = Date.now(); // Use timestamp for sorting
                            
                            await env.DB.prepare(`
                                INSERT INTO event_media (id, event_id, media_url, media_type, sort_order, uploaded_by, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                mediaId, 
                                eventId, 
                                mediaUrl,
                                mediaType, 
                                sortOrder,
                                user.userId, 
                                new Date().toISOString()
                            ).run();
                            
                            fileUrl = `/api/media/${mediaId}`;
                        } else {
                            uploadSuccess = false;
                            // Fallback to base64 for display if upload failed
                            fileUrl = `data:${file.type};base64,${await fileToBase64(file)}`;
                        }
                    } catch (r2Error) {
                        console.error('R2 upload failed:', r2Error);
                        uploadSuccess = false;
                        // Fallback to base64 for display if upload failed
                        fileUrl = `data:${file.type};base64,${await fileToBase64(file)}`;
                    }
                    
                    uploadedFiles.push({
                        url: fileUrl,
                        type: file.type.startsWith('video/') ? 'video' : 'photo',
                        name: file.name,
                        size: file.size,
                        r2FileName: uploadSuccess ? fileName : null
                    });
                }

                return new Response(JSON.stringify({ success: true, files: uploadedFiles }), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Media upload error:', error);
                return new Response(JSON.stringify({ error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Serve media files
        if (url.pathname.match(/\/api\/media\/([^\/]+)$/) && request.method === 'GET') {
            const mediaId = url.pathname.split('/')[3];
            
            try {
                // Check for conditional requests
                const ifNoneMatch = request.headers.get('If-None-Match');
                const range = request.headers.get('Range');
                
                // Get media info with standard lookup (works with existing schema)
                const mediaInfo = await env.DB.prepare(`
                    SELECT em.*, e.id as event_id, td.album_id
                    FROM event_media em
                    JOIN events e ON em.event_id = e.id
                    JOIN trip_days td ON e.trip_day_id = td.id
                    WHERE em.id = ?
                `).bind(mediaId).first();
                
                if (!mediaInfo) {
                    return new Response('Media not found', { status: 404 });
                }
                
                // Reconstruct the R2 key based on mediaId and event info
                const mediaType = (mediaInfo as any).media_type === 'video' ? 'videos' : 'photos';
                const albumId = (mediaInfo as any).album_id;
                const eventId = (mediaInfo as any).event_id;
                
                // Extract timestamp and randomId from mediaId (format: media-{timestamp}_{randomId})
                const idParts = mediaId.replace('media-', '');
                
                // Try to find the file in R2 by listing objects with the prefix
                const r2Prefix = `albums/${albumId}/media/${mediaType}/${eventId}/`;
                const objects = await env.BUCKET.list({ prefix: r2Prefix });
                
                // Find the object that matches our mediaId pattern
                const matchingObject = objects.objects.find(obj => {
                    const filename = obj.key.split('/').pop() || '';
                    const filenameWithoutExt = filename.split('.')[0];
                    return filenameWithoutExt === idParts;
                });
                
                if (!matchingObject) {
                    return new Response('File not found in storage', { status: 404 });
                }
                
                const actualR2Key = matchingObject.key;
                
                // Handle range requests for better video streaming
                let r2Options: any = {};
                let status = 200;
                
                if (range) {
                    const matches = range.match(/bytes=(\d+)-(\d*)/);
                    if (matches) {
                        const start = parseInt(matches[1]);
                        const end = matches[2] ? parseInt(matches[2]) : undefined;
                        
                        r2Options.range = {
                            offset: start,
                            length: end ? (end - start + 1) : undefined
                        };
                        status = 206; // Partial Content
                    }
                }
                
                // Get file from R2 using the actual key
                const r2Object = await env.BUCKET.get(actualR2Key, r2Options);
                
                if (!r2Object) {
                    return new Response('File not found in storage', { status: 404 });
                }
                
                // If we have an ETag and it matches, return 304
                if (ifNoneMatch && r2Object.etag && ifNoneMatch === r2Object.etag) {
                    return new Response(null, { status: 304 });
                }
                
                // Determine content type from file extension
                const fileExtension = actualR2Key.split('.').pop()?.toLowerCase();
                const contentType = fileExtension === 'mp4' ? 'video/mp4' : 
                                   fileExtension === 'webm' ? 'video/webm' :
                                   fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' :
                                   fileExtension === 'png' ? 'image/png' :
                                   fileExtension === 'webp' ? 'image/webp' : 'application/octet-stream';
                
                const headers: Record<string, string> = {
                    ...corsHeaders,
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'ETag': r2Object.etag || '',
                    'Content-Disposition': `inline; filename="${actualR2Key.split('/').pop()}"`,
                    'Accept-Ranges': 'bytes',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'SAMEORIGIN'
                };
                
                if (status === 206 && range) {
                    // For range requests, we need to calculate the actual range served
                    const matches = range.match(/bytes=(\d+)-(\d*)/);
                    if (matches) {
                        const start = parseInt(matches[1]);
                        const end = matches[2] ? parseInt(matches[2]) : (r2Object.size - 1);
                        headers['Content-Range'] = `bytes ${start}-${end}/${r2Object.size}`;
                        headers['Content-Length'] = (end - start + 1).toString();
                    }
                } else {
                    headers['Content-Length'] = r2Object.size.toString();
                }
                
                return new Response((r2Object as R2ObjectBody).body, { status, headers });
            } catch (error) {
                console.error('Error serving media:', error);
                return new Response('Error serving media', { status: 500 });
            }
        }
        
        // Delete media
        if (url.pathname.match(/\/api\/media\/([^\/]+)$/) && request.method === 'DELETE') {
            const mediaId = url.pathname.split('/')[3];
            const { userId, password } = await request.json() as { userId: string; password: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            try {
                // Get media info to check uploader and get R2 key
                const mediaInfo = await env.DB.prepare(`
                    SELECT em.*, e.id as event_id, td.album_id
                    FROM event_media em
                    JOIN events e ON em.event_id = e.id
                    JOIN trip_days td ON e.trip_day_id = td.id
                    WHERE em.id = ?
                `).bind(mediaId).first();
                
                if (!mediaInfo) {
                    return new Response(JSON.stringify({ error: 'Media not found' }), { 
                        status: 404, 
                        headers: corsHeaders
                    });
                }
                
                // Check if user is the uploader
                if ((mediaInfo as any).uploaded_by !== user.userId) {
                    return new Response(JSON.stringify({ error: 'Not authorized to delete this media' }), { 
                        status: 403, 
                        headers: corsHeaders
                    });
                }
                
                // Reconstruct R2 key and delete from R2
                const mediaType = (mediaInfo as any).media_type === 'video' ? 'videos' : 'photos';
                const albumId = (mediaInfo as any).album_id;
                const eventId = (mediaInfo as any).event_id;
                const idParts = mediaId.replace('media-', '');
                
                // Find the R2 object to delete
                const r2Prefix = `albums/${albumId}/media/${mediaType}/${eventId}/`;
                const objects = await env.BUCKET.list({ prefix: r2Prefix });
                const matchingObject = objects.objects.find(obj => {
                    const filename = obj.key.split('/').pop() || '';
                    const filenameWithoutExt = filename.split('.')[0];
                    return filenameWithoutExt === idParts;
                });
                
                if (matchingObject) {
                    await env.BUCKET.delete(matchingObject.key);
                }
                
                // Delete from database
                await env.DB.prepare('DELETE FROM event_media WHERE id = ?').bind(mediaId).run();
                
                return new Response(JSON.stringify({ success: true }), {
                    headers: corsHeaders
                });
                
            } catch (error) {
                console.error('Error deleting media:', error);
                return new Response(JSON.stringify({ error: 'Failed to delete media' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Location autocomplete route
        if (url.pathname === '/api/location/autocomplete' && request.method === 'GET') {
            const query = url.searchParams.get('query');
            const apiKey = env.GEOAPIFY_API_KEY;
            
            if (!query) {
                return new Response(JSON.stringify({ error: 'Query parameter required' }), {
                    status: 400,
                    headers: corsHeaders
                });
            }
            
            if (!apiKey) {
                return new Response(JSON.stringify({ features: [] }), {
                    headers: corsHeaders
                });
            }
            
            try {
                const response = await fetch(
                    `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${apiKey}`,
                    { method: 'GET' }
                );
                const result = await response.json();
                
                return new Response(JSON.stringify(result), {
                    headers: corsHeaders
                });
            } catch (error) {
                console.error('Location API error:', error);
                return new Response(JSON.stringify({ features: [] }), {
                    headers: corsHeaders
                });
            }
        }
        
        
        // Get comments for media
        if (url.pathname.match(/\/api\/media\/([^\/]+)\/comments$/) && request.method === 'GET') {
            const mediaId = url.pathname.split('/')[3];
            const userId = url.searchParams.get('userId');
            const password = url.searchParams.get('password');
            
            if (!userId || !password) {
                return new Response(JSON.stringify({ error: 'Authentication required' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }
            
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            try {
                // Verify media exists and user has access
                const mediaInfo = await env.DB.prepare(`
                    SELECT em.id
                    FROM event_media em
                    JOIN events e ON em.event_id = e.id
                    JOIN trip_days td ON e.trip_day_id = td.id
                    JOIN album_participants ap ON td.album_id = ap.album_id
                    WHERE em.id = ? AND ap.user_id = ?
                `).bind(mediaId, user.userId).first();

                if (!mediaInfo) {
                    return new Response(JSON.stringify({ error: 'Media not found or access denied' }), { 
                        status: 404, 
                        headers: corsHeaders
                    });
                }

                // Get comments for the media
                const comments = await env.DB.prepare(`
                    SELECT mc.*, mc.user_id as author_id
                    FROM media_comments mc
                    WHERE mc.media_id = ?
                    ORDER BY mc.created_at ASC
                `).bind(mediaId).all();

                // Format comments with author info
                const formattedComments = comments.results?.map((comment: any) => ({
                    id: comment.id,
                    mediaId: comment.media_id,
                    userId: comment.user_id,
                    content: comment.comment,
                    createdAt: comment.created_at,
                    updatedAt: comment.updated_at,
                    author: {
                        id: comment.author_id,
                        name: comment.author_id,
                        avatar: `https://picsum.photos/80/80?random=${comment.author_id.length}`
                    }
                })) || [];

                return new Response(JSON.stringify(formattedComments), {
                    headers: corsHeaders
                });
            } catch (error) {
                console.error('Error fetching comments:', error);
                return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Add comment to media
        if (url.pathname.match(/\/api\/media\/([^\/]+)\/comments$/) && request.method === 'POST') {
            const mediaId = url.pathname.split('/')[3];
            const { userId, password, content } = await request.json() as { userId: string; password: string; content: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            // Validate content
            if (!content || content.trim().length === 0) {
                return new Response(JSON.stringify({ error: 'Comment content is required' }), { 
                    status: 400, 
                    headers: corsHeaders
                });
            }

            if (content.length > 1000) {
                return new Response(JSON.stringify({ error: 'Comment content too long (max 1000 characters)' }), { 
                    status: 400, 
                    headers: corsHeaders
                });
            }

            try {
                // Verify media exists and user has access
                const mediaInfo = await env.DB.prepare(`
                    SELECT em.id
                    FROM event_media em
                    JOIN events e ON em.event_id = e.id
                    JOIN trip_days td ON e.trip_day_id = td.id
                    JOIN album_participants ap ON td.album_id = ap.album_id
                    WHERE em.id = ? AND ap.user_id = ?
                `).bind(mediaId, user.userId).first();

                if (!mediaInfo) {
                    return new Response(JSON.stringify({ error: 'Media not found or access denied' }), { 
                        status: 404, 
                        headers: corsHeaders
                    });
                }

                const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                const now = new Date().toISOString();

                // Create the comment
                await env.DB.prepare(`
                    INSERT INTO media_comments (id, media_id, user_id, comment, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(commentId, mediaId, user.userId, content.trim(), now, now).run();

                // Return the created comment with author info
                const newComment = {
                    id: commentId,
                    mediaId: mediaId,
                    userId: user.userId,
                    content: content.trim(),
                    createdAt: now,
                    updatedAt: now,
                    author: {
                        id: user.userId,
                        name: user.userId,
                        avatar: `https://picsum.photos/80/80?random=${user.userId.length}`
                    }
                };

                return new Response(JSON.stringify(newComment), {
                    status: 201,
                    headers: corsHeaders
                });
            } catch (error) {
                console.error('Error creating comment:', error);
                return new Response(JSON.stringify({ error: 'Failed to create comment' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Update comment
        if (url.pathname.match(/\/api\/comments\/([^\/]+)$/) && request.method === 'PUT') {
            const commentId = url.pathname.split('/')[3];
            const { userId, password, content } = await request.json() as { userId: string; password: string; content: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            // Validate content
            if (!content || content.trim().length === 0) {
                return new Response(JSON.stringify({ error: 'Comment content is required' }), { 
                    status: 400, 
                    headers: corsHeaders
                });
            }

            if (content.length > 1000) {
                return new Response(JSON.stringify({ error: 'Comment content too long (max 1000 characters)' }), { 
                    status: 400, 
                    headers: corsHeaders
                });
            }

            try {
                // Check if comment exists and user owns it
                const comment = await env.DB.prepare(`
                    SELECT mc.*, em.id as media_id
                    FROM media_comments mc
                    JOIN event_media em ON mc.media_id = em.id
                    JOIN events e ON em.event_id = e.id
                    JOIN trip_days td ON e.trip_day_id = td.id
                    JOIN album_participants ap ON td.album_id = ap.album_id
                    WHERE mc.id = ? AND mc.user_id = ? AND ap.user_id = ?
                `).bind(commentId, user.userId, user.userId).first();

                if (!comment) {
                    return new Response(JSON.stringify({ error: 'Comment not found or access denied' }), { 
                        status: 404, 
                        headers: corsHeaders
                    });
                }

                const now = new Date().toISOString();

                // Update the comment
                await env.DB.prepare(`
                    UPDATE media_comments 
                    SET comment = ?, updated_at = ?
                    WHERE id = ?
                `).bind(content.trim(), now, commentId).run();

                // Return updated comment with author info
                const updatedComment = {
                    id: commentId,
                    mediaId: (comment as any).media_id,
                    userId: user.userId,
                    content: content.trim(),
                    createdAt: (comment as any).created_at,
                    updatedAt: now,
                    author: {
                        id: user.userId,
                        name: user.userId,
                        avatar: `https://picsum.photos/80/80?random=${user.userId.length}`
                    }
                };

                return new Response(JSON.stringify(updatedComment), {
                    headers: corsHeaders
                });
            } catch (error) {
                console.error('Error updating comment:', error);
                return new Response(JSON.stringify({ error: 'Failed to update comment' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Delete comment
        if (url.pathname.match(/\/api\/comments\/([^\/]+)$/) && request.method === 'DELETE') {
            const commentId = url.pathname.split('/')[3];
            const { userId, password } = await request.json() as { userId: string; password: string };
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            try {
                // Check if comment exists and user owns it
                const comment = await env.DB.prepare(`
                    SELECT id, user_id FROM media_comments WHERE id = ?
                `).bind(commentId).first();

                if (!comment || comment.user_id !== user.userId) {
                    return new Response(JSON.stringify({ error: 'Comment not found or access denied' }), { 
                        status: 404, 
                        headers: corsHeaders
                    });
                }

                // Delete the comment
                await env.DB.prepare(`
                    DELETE FROM media_comments WHERE id = ?
                `).bind(commentId).run();

                return new Response(JSON.stringify({ success: true }), {
                    headers: corsHeaders
                });
            } catch (error) {
                console.error('Error deleting comment:', error);
                return new Response(JSON.stringify({ error: 'Failed to delete comment' }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        console.log('END OF API HANDLER - No route matched');
        return new Response(JSON.stringify({ error: 'Not found' }), { 
            status: 404, 
            headers: corsHeaders 
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
}