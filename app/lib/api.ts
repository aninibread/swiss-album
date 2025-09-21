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
                            // Use the media_url directly from database
                            if (m.media_url) {
                                const mediaItem = {
                                    url: m.media_url,
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
                await env.DB.prepare(`
                    UPDATE events 
                    SET name = ?, description = ?, emoji = ?, location = ?
                    WHERE id = ?
                `).bind(name, description, emoji, location, eventId).run();
                
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
                // Create the event
                await env.DB.prepare(`
                    INSERT INTO events (id, trip_day_id, name, description, emoji, location, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(eventId, tripDayId, name, description, emoji, location, sortOrder).run();
                
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