interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    CACHE: KVNamespace;
    REALTIME: KVNamespace;
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Simple authentication - just check user ID and password
async function authenticate(userId: string, password: string, env: Env) {
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? AND password = ?')
        .bind(userId, password)
        .first();
    
    return user ? { userId: user.id as string } : null;
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response | null> {
    const url = new URL(request.url);
    
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
            const { userId, password } = await request.json();
            
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
            const { userId, password } = await request.json();
            
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
            const { userId, password } = await request.json();
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
            const { userId, password } = await request.json();
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

            // Get events with participants
            const events = await env.DB.prepare(`
                SELECT e.*, 
                       GROUP_CONCAT(ep.user_id) as participant_ids
                FROM events e
                LEFT JOIN event_participants ep ON e.id = ep.event_id
                WHERE e.trip_day_id IN (SELECT id FROM trip_days WHERE album_id = ?)
                GROUP BY e.id
                ORDER BY e.trip_day_id, e.sort_order
            `).bind(albumId).all();

            // Get album participants
            const participants = await env.DB.prepare(`
                SELECT user_id FROM album_participants 
                WHERE album_id = ?
            `).bind(albumId).all();

            // Format the data
            const formattedDays = days.results?.map((day: any) => {
                const dayEvents = events.results?.filter((event: any) => event.trip_day_id === day.id) || [];
                
                return {
                    id: day.id,
                    date: day.date,
                    title: day.title,
                    heroPhoto: day.hero_photo_url || "https://picsum.photos/800/600?random=1",
                    photoCount: 0, // Will be updated when media is implemented
                    backgroundColor: day.background_color || "bg-blue-100",
                    events: dayEvents.map((event: any) => ({
                        id: event.id,
                        name: event.name,
                        description: event.description,
                        location: event.location,
                        emoji: event.emoji,
                        photos: [], // Will be populated from event_media table later
                        videos: [],
                        participants: event.participant_ids 
                            ? event.participant_ids.split(',').map((userId: string) => ({
                                id: userId.trim(),
                                name: userId.trim(),
                                avatar: `https://picsum.photos/80/80?random=${userId.trim().length}`
                            }))
                            : []
                    }))
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
        
        // Update event
        if (url.pathname.match(/\/api\/events\/([^\/]+)$/) && request.method === 'PUT') {
            const eventId = url.pathname.split('/')[3];
            const { userId, password, name, description, emoji, location } = await request.json();
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            console.log('Updating event:', eventId, 'with data:', { name, description, emoji, location });
            
            try {
                const result = await env.DB.prepare(`
                    UPDATE events 
                    SET name = ?, description = ?, emoji = ?, location = ?
                    WHERE id = ?
                `).bind(name, description, emoji, location, eventId).run();
                
                console.log('Update result:', result);
                
                return new Response(JSON.stringify({ success: true }), {
                    headers: corsHeaders
                });
            } catch (dbError) {
                console.error('Database error updating event:', dbError);
                return new Response(JSON.stringify({ error: 'Database error', details: dbError.message }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Add new event
        if (url.pathname === '/api/events' && request.method === 'POST') {
            const { userId, password, tripDayId, name, description, emoji, location, sortOrder, participantIds } = await request.json();
            const user = await authenticate(userId, password, env);
            
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                    status: 401, 
                    headers: corsHeaders
                });
            }

            const eventId = `event-${Date.now()}`;
            console.log('Creating new event:', eventId, 'for tripDayId:', tripDayId, 'with participants:', participantIds);
            
            try {
                // Create the event
                const result = await env.DB.prepare(`
                    INSERT INTO events (id, trip_day_id, name, description, emoji, location, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(eventId, tripDayId, name, description, emoji, location, sortOrder).run();
                
                console.log('Event creation result:', result);
                
                // Add participants if provided
                if (participantIds && Array.isArray(participantIds)) {
                    for (const participantId of participantIds) {
                        await env.DB.prepare(`
                            INSERT INTO event_participants (event_id, user_id)
                            VALUES (?, ?)
                        `).bind(eventId, participantId).run();
                    }
                    console.log('Added participants:', participantIds);
                }
                
                return new Response(JSON.stringify({ success: true, eventId }), {
                    headers: corsHeaders
                });
            } catch (dbError) {
                console.error('Database error creating event:', dbError);
                return new Response(JSON.stringify({ error: 'Database error', details: dbError.message }), { 
                    status: 500, 
                    headers: corsHeaders
                });
            }
        }
        
        // Delete event
        if (url.pathname.match(/\/api\/events\/([^\/]+)$/) && request.method === 'DELETE') {
            const eventId = url.pathname.split('/')[3];
            const { userId, password } = await request.json();
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
            const { userId, password, title, date } = await request.json();
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
            const { userId, password, albumId, title, date } = await request.json();
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
            const { userId, password } = await request.json();
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
            const { userId, password, participantId, action } = await request.json(); // action: 'add' or 'remove'
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