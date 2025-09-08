# Swiss Album - Implementation Guide

## Prerequisites
- Cloudflare account with Workers, D1, R2, and KV enabled
- Node.js and npm installed
- Wrangler CLI installed (`npm install -g wrangler`)
- React Router 7 project (already created via create-cloudflare CLI)

## Step 1: Cloudflare Setup

### 1.1 Authenticate Wrangler
```bash
wrangler login
```

### 1.2 Create D1 Database
```bash
wrangler d1 create swiss-album-db
```

Copy the database ID from the output and save it for later.

### 1.3 Create R2 Bucket
```bash
wrangler r2 bucket create swiss-album-media
```

### 1.4 Create KV Namespaces
```bash
wrangler kv namespace create "swiss-album-cache"
wrangler kv namespace create "swiss-album-realtime"
```

Save the namespace IDs from the outputs.

## Step 2: Project Configuration

### 2.1 Install Required Dependencies
```bash
npm install itty-router
npm install @types/crypto-js --save-dev
```

### 2.2 Update wrangler.jsonc
Add these configurations to your existing `wrangler.jsonc`:

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "swiss-album",
	"compatibility_date": "2025-04-04",
	"main": "./workers/app.ts",
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "swiss-album-db",
			"database_id": "YOUR_DATABASE_ID"
		}
	],
	"r2_buckets": [
		{
			"binding": "BUCKET",
			"bucket_name": "swiss-album-media"
		}
	],
	"kv_namespaces": [
		{
			"binding": "CACHE",
			"id": "YOUR_CACHE_NAMESPACE_ID"
		},
		{
			"binding": "REALTIME",
			"id": "YOUR_REALTIME_NAMESPACE_ID"
		}
	],
	"vars": {
		"MAX_FILE_SIZE": "10485760",
		"ALLOWED_IMAGE_TYPES": "image/jpeg,image/png,image/webp",
		"ALLOWED_VIDEO_TYPES": "video/mp4,video/webm"
	},
	"observability": {
		"enabled": true
	}
}

## Step 3: Database Schema Setup

### 3.1 Create Database Schema File
Create `schema.sql` in your project root:

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Albums table
CREATE TABLE albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Album participants
CREATE TABLE album_participants (
    album_id TEXT,
    user_id TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, user_id),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trip days
CREATE TABLE trip_days (
    id TEXT PRIMARY KEY,
    album_id TEXT NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    hero_photo_url TEXT,
    background_color TEXT DEFAULT 'bg-blue-100',
    sort_order INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

-- Events
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    trip_day_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    emoji TEXT DEFAULT '✨',
    sort_order INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_day_id) REFERENCES trip_days(id) ON DELETE CASCADE
);

-- Event media
CREATE TABLE event_media (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('photo', 'video')) NOT NULL,
    sort_order INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Media comments
CREATE TABLE media_comments (
    id TEXT PRIMARY KEY,
    media_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES event_media(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Event participants
CREATE TABLE event_participants (
    event_id TEXT,
    user_id TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3.2 Apply Schema to Database
```bash
wrangler d1 execute swiss-album-db --file=schema.sql
```

## Step 4: Create User Profile Configuration

### 4.1 Create User Profiles File
Create `app/config/userProfiles.ts`:

```typescript
export interface UserProfile {
    name: string;
    avatar: string;
}

export const USER_PROFILES: Record<string, UserProfile> = {
    "anni": {
        name: "Anni",
        avatar: "albums/avatars/anni.jpg"
    },
    "andy": {
        name: "Andy",
        avatar: "albums/avatars/andy.jpg" 
    },
    "franco": {
        name: "Franco",
        avatar: "albums/avatars/franco.jpg"
    },
    "lu": {
        name: "Kevin L.",
        avatar: "albums/avatars/lu.jpg"
    },
    "meng": {
        name: "Kevin M.",
        avatar: "albums/avatars/meng.jpg"
    }
};

export function getUserProfile(userId: string): UserProfile {
    return USER_PROFILES[userId] || {
        name: userId,
        avatar: "albums/album-1/avatars/default.jpg"
    };
}

## Step 5: Seed Initial Data

### 5.1 Create Seed Data File
Create `seed.sql`:

```sql
-- Insert test users
INSERT INTO users (id, password) VALUES 
('anni', 'ilovelaswiss'),
('andy', 'ilovelaswiss'),
('franco', 'ilovelaswiss'),
('lu', 'ilovelaswiss'),
('meng', 'ilovelaswiss');

-- Insert sample album
INSERT INTO albums (id, title, description, created_by) VALUES 
('album-1', 'Swiss Adventure', 'Our amazing group trip to Switzerland!', 'anni');

-- Add album participants
INSERT INTO album_participants (album_id, user_id) VALUES 
('album-1', 'anni'),
('album-1', 'andy'),
('album-1', 'franco'),
('album-1', 'lu'),
('album-1', 'meng');

-- Insert trip days
INSERT INTO trip_days (id, album_id, date, title, sort_order) VALUES 
('day-1', 'album-1', 'July 15, 2024', 'Arrival in Zurich', 1),
('day-2', 'album-1', 'July 16, 2024', 'Exploring Lucerne', 2),
('day-3', 'album-1', 'July 17, 2024', 'Jungfraujoch Adventure', 3);

-- Insert events
INSERT INTO events (id, trip_day_id, name, description, location, emoji, sort_order) VALUES 
-- Day 1: Arrival in Zurich
('event-1', 'day-1', 'Flight Landing', 'Finally made it to Switzerland! ✈️', 'Zurich Airport (ZUR)', '✈️', 1),
('event-2', 'day-1', 'Airport Pickup', 'Rental car pickup and first glimpse of Swiss efficiency', 'Zurich Airport - Rental Center', '🚗', 2),
('event-3', 'day-1', 'Hotel Check-in', 'Settling into our cozy Swiss accommodation', 'Hotel Schweizerhof Zurich', '🏨', 3),
('event-4', 'day-1', 'First Swiss Meal', 'Traditional Swiss cuisine at a local restaurant', 'Restaurant Zunfthaus zur Waag', '🍽️', 4),
('event-5', 'day-1', 'Evening Stroll', 'Walking around Zurich old town to beat jet lag', 'Zurich Old Town (Altstadt)', '🚶', 5),

-- Day 2: Exploring Lucerne  
('event-6', 'day-2', 'Train to Lucerne', 'Scenic train ride through Swiss countryside', 'Zurich HB to Lucerne', '🚂', 1),
('event-7', 'day-2', 'Chapel Bridge Walk', 'Walking across the famous wooden bridge', 'Chapel Bridge (Kapellbrücke)', '🌉', 2),
('event-8', 'day-2', 'Mt. Pilatus Cable Car', 'Breathtaking cable car ride up the mountain', 'Mount Pilatus', '🚠', 3),
('event-9', 'day-2', 'Swiss Fondue Dinner', 'Authentic fondue experience with local wine', 'Restaurant Balances', '🫕', 4),
('event-10', 'day-2', 'Lake Lucerne Cruise', 'Sunset boat ride on pristine alpine lake', 'Lake Lucerne', '⛵', 5),

-- Day 3: Jungfraujoch Adventure
('event-11', 'day-3', 'Early Morning Departure', 'Starting our journey to Top of Europe', 'Hotel Schweizerhof Zurich', '⏰', 1),
('event-12', 'day-3', 'Train to Jungfraujoch', 'Amazing train journey through the Alps', 'Kleine Scheidegg to Jungfraujoch', '🚂', 2),
('event-13', 'day-3', 'Ice Palace Visit', 'Exploring the magical ice sculptures underground', 'Jungfraujoch Ice Palace', '🧊', 3),
('event-14', 'day-3', 'Sphinx Observatory', 'Panoramic views from the highest viewpoint', 'Sphinx Observatory, Jungfraujoch', '🔭', 4),
('event-15', 'day-3', 'Alpine Hiking', 'Short hike on glacier trails with stunning views', 'Aletsch Glacier Trail', '🥾', 5),
('event-16', 'day-3', 'Swiss Chocolate Tasting', 'Sampling the finest Swiss chocolates', 'Lindt Chocolate Studio, Jungfraujoch', '🍫', 6);

-- Add event participants
INSERT INTO event_participants (event_id, user_id) VALUES 
-- Day 1 events - everyone arrives together
('event-1', 'anni'), ('event-1', 'andy'), ('event-1', 'franco'), ('event-1', 'lu'), ('event-1', 'meng'),
('event-2', 'anni'), ('event-2', 'andy'), ('event-2', 'franco'), ('event-2', 'lu'), ('event-2', 'meng'),
('event-3', 'anni'), ('event-3', 'andy'), ('event-3', 'franco'), ('event-3', 'lu'), ('event-3', 'meng'),
('event-4', 'anni'), ('event-4', 'andy'), ('event-4', 'franco'), ('event-4', 'lu'),
('event-5', 'anni'), ('event-5', 'andy'), ('event-5', 'franco'),

-- Day 2 events - various group combinations
('event-6', 'anni'), ('event-6', 'andy'), ('event-6', 'franco'), ('event-6', 'lu'), ('event-6', 'meng'),
('event-7', 'anni'), ('event-7', 'andy'), ('event-7', 'lu'), ('event-7', 'meng'),
('event-8', 'anni'), ('event-8', 'franco'), ('event-8', 'lu'),
('event-9', 'anni'), ('event-9', 'andy'), ('event-9', 'franco'), ('event-9', 'lu'), ('event-9', 'meng'),
('event-10', 'anni'), ('event-10', 'andy'), ('event-10', 'meng'),

-- Day 3 events - adventure day
('event-11', 'anni'), ('event-11', 'andy'), ('event-11', 'franco'), ('event-11', 'lu'), ('event-11', 'meng'),
('event-12', 'anni'), ('event-12', 'andy'), ('event-12', 'franco'), ('event-12', 'lu'), ('event-12', 'meng'),
('event-13', 'anni'), ('event-13', 'andy'), ('event-13', 'lu'),
('event-14', 'anni'), ('event-14', 'franco'), ('event-14', 'lu'), ('event-14', 'meng'),
('event-15', 'anni'), ('event-15', 'andy'), ('event-15', 'franco'),
('event-16', 'anni'), ('event-16', 'andy'), ('event-16', 'franco'), ('event-16', 'lu'), ('event-16', 'meng');
```

### 5.2 Apply Seed Data
```bash
wrangler d1 execute swiss-album-db --file=seed.sql
```

## Step 6: React Router 7 Integration

### 6.1 Create API Route Module
Create `app/lib/api.ts`:

```typescript
import { Router } from 'itty-router';
import { getUserProfile } from '../config/userProfiles';

interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    CACHE: KVNamespace;
    REALTIME: KVNamespace;
}

const apiRouter = Router();

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight requests
apiRouter.options('/api/*', () => new Response(null, { status: 200, headers: corsHeaders }));

// Simple authentication - just check user ID and password
async function authenticate(request: Request, env: Env) {
    const body = await request.json();
    const { userId, password } = body;
    
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? AND password = ?')
        .bind(userId, password)
        .first();
    
    return user ? { userId: user.id as string } : null;
}

// Auth routes
apiRouter.post('/api/auth/login', async (request: Request, env: Env) => {
    try {
        const user = await authenticate(request, env);

        if (!user) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const profile = getUserProfile(user.userId);

        return new Response(JSON.stringify({
            success: true,
            user: { userId: user.userId, ...profile }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Login failed' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

apiRouter.post('/api/auth/register', async (request: Request, env: Env) => {
    try {
        const { userId, password } = await request.json();
        
        // Check if user already exists
        const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
            .bind(userId)
            .first();

        if (existing) {
            return new Response(JSON.stringify({ error: 'User already exists' }), { 
                status: 409, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Create user
        await env.DB.prepare('INSERT INTO users (id, password) VALUES (?, ?)')
            .bind(userId, password)
            .run();

        return new Response(JSON.stringify({ message: 'User created successfully' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Registration failed' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Album routes - requires userId and password in request body for authentication
apiRouter.post('/api/albums', async (request: Request, env: Env) => {
    try {
        const user = await authenticate(request, env);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const albums = await env.DB.prepare(`
            SELECT a.* 
            FROM albums a 
            JOIN album_participants ap ON a.id = ap.album_id 
            WHERE ap.user_id = ?
        `).bind(user.userId).all();

        return new Response(JSON.stringify(albums.results), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch albums' }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

export async function handleApiRequest(request: Request, env: Env): Promise<Response | null> {
    const url = new URL(request.url);
    
    // Only handle API routes
    if (!url.pathname.startsWith('/api/')) {
        return null;
    }
    
    return await apiRouter.handle(request, env);
}
```

### 6.2 Update Workers Entry Point
Update `workers/app.ts` to handle both React Router and API routes:

```typescript
import { createRequestHandler } from "react-router";
import { handleApiRequest } from "../app/lib/api";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: {
        DB: D1Database;
        BUCKET: R2Bucket;
        CACHE: KVNamespace;
        REALTIME: KVNamespace;
        MAX_FILE_SIZE: string;
        ALLOWED_IMAGE_TYPES: string;
        ALLOWED_VIDEO_TYPES: string;
      };
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    // Try to handle API requests first
    const apiResponse = await handleApiRequest(request, env as any);
    if (apiResponse) {
      return apiResponse;
    }

    // Fall back to React Router for regular app routes
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<{
  DB: D1Database;
  BUCKET: R2Bucket;
  CACHE: KVNamespace;
  REALTIME: KVNamespace;
  MAX_FILE_SIZE: string;
  ALLOWED_IMAGE_TYPES: string;
  ALLOWED_VIDEO_TYPES: string;
}>;
```

## Step 7: Frontend Integration

### 7.1 Create API Service
Create `app/services/api.ts`:

```typescript
class ApiService {
    private userId: string | null = null;
    private password: string | null = null;

    setCredentials(userId: string, password: string) {
        this.userId = userId;
        this.password = password;
        if (typeof window !== 'undefined') {
            localStorage.setItem('user_id', userId);
            localStorage.setItem('user_password', password);
        }
    }

    getCredentials() {
        if (!this.userId || !this.password) {
            if (typeof window !== 'undefined') {
                this.userId = localStorage.getItem('user_id');
                this.password = localStorage.getItem('user_password');
            }
        }
        return { userId: this.userId, password: this.password };
    }

    async request(endpoint: string, data: any = {}) {
        const credentials = this.getCredentials();
        
        const body = {
            ...data,
            ...credentials
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.json();
    }

    async login(userId: string, password: string) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, password }),
        });

        const result = await response.json();
        
        if (result.success) {
            this.setCredentials(userId, password);
        }

        return result;
    }

    async register(userId: string, password: string) {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, password }),
        });

        return response.json();
    }

    async getAlbums() {
        return this.request('/api/albums');
    }

    clearCredentials() {
        this.userId = null;
        this.password = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_password');
        }
    }
}

export const api = new ApiService();
```

## Step 8: Testing Setup

### 8.1 Start Development Server
```bash
npm run dev
```

Your app will be available at `http://localhost:5173`

### 8.2 Test Authentication
```bash
# Test registration
curl -X POST http://localhost:5173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"userId": "testuser", "password": "testpass"}'

# Test login
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "anni", "password": "password123"}'

# Test getting albums (requires credentials)
curl -X POST http://localhost:5173/api/albums \
  -H "Content-Type: application/json" \
  -d '{"userId": "anni", "password": "password123"}'
```

## Step 9: Deployment

### 9.1 Deploy to Cloudflare
```bash
npm run deploy
```

Your app will be deployed to your Cloudflare Workers domain.

## Step 10: Verification

1. ✅ Users can register and login
2. ✅ Database contains seed data
3. ✅ API endpoints return data
4. ✅ R2 bucket is ready for file uploads
5. ✅ KV namespaces are created and accessible

## Next Steps

Now you can:
- Implement remaining API endpoints (events, media, comments)
- Add file upload functionality to R2
- Integrate real-time features with KV
- Connect your React frontend to the API

Your dynamic Swiss Album architecture is now ready to use!