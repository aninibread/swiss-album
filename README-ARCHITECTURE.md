# Swiss Album App - Dynamic Architecture

## Overview
Transform the Swiss Album app from hard-coded data to a fully dynamic, collaborative photo album platform using Cloudflare's edge computing stack.

## Cloudflare Resources Required

### 1. D1 Database: `swiss-album-db`
Primary SQL database for structured data and relationships.

#### Database Schema

**users**
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**albums**
```sql
CREATE TABLE albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**album_participants**
```sql
CREATE TABLE album_participants (
    album_id TEXT,
    user_id TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, user_id),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**trip_days**
```sql
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
```

**events**
```sql
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    trip_day_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '✨',
    sort_order INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_day_id) REFERENCES trip_days(id) ON DELETE CASCADE
);
```

**event_media**
```sql
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
```

**media_comments**
```sql
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
```

**event_participants**
```sql
CREATE TABLE event_participants (
    event_id TEXT,
    user_id TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. R2 Bucket: `swiss-album-media`
Object storage for all media files with organized folder structure.

#### Folder Structure
```
/albums/{album_id}/
├── avatars/
│   └── {user_id}.jpg
└── media/
    ├── photos/
    │   └── {event_id}/{upload_timestamp}_{random_id}.jpg
    └── videos/
        └── {event_id}/{upload_timestamp}_{random_id}.mp4
```

#### File Naming Convention
- Photos: `{event_id}/{upload_timestamp}_{random_id}.jpg`
- Videos: `{event_id}/{upload_timestamp}_{random_id}.mp4`
- Avatars: `{user_id}.jpg`
- Upload timestamp format: `YYYYMMDD_HHMMSS`

### 3. Hard-coded User Profiles
User profiles and avatars are statically defined in the application code.

#### Profile Configuration
```javascript
// In your Worker or app config
const USER_PROFILES = {
    "anni": {
        name: "Anni",
        avatar: "https://picsum.photos/80/80?random=30"
    },
    "sarah": {
        name: "Sarah",
        avatar: "https://picsum.photos/80/80?random=31" 
    },
    "mike": {
        name: "Mike",
        avatar: "https://picsum.photos/80/80?random=32"
    },
    "emma": {
        name: "Emma",
        avatar: "https://picsum.photos/80/80?random=33"
    }
};
```

### 4. KV Namespaces

#### `swiss-album-sessions`
User authentication and session management.
```javascript
// Key format: session:{session_id}
{
    userId: "user_123",
    name: "John Doe",
    expiresAt: "2024-12-31T23:59:59Z"
}
```

#### `swiss-album-cache`
Performance optimization and caching.
```javascript
// Key format: album:{album_id}:full
{
    album: {...},
    days: [...],
    events: [...],
    media: [...], // includes uploader info
    comments: [...], // includes commenter info
    participants: [...],
    cachedAt: "2024-01-01T00:00:00Z",
    ttl: 300 // seconds
}

// Key format: media:{media_id}:comments
{
    comments: [
        {
            id: "comment_123",
            mediaId: "media_456",
            userId: "user_789",
            userName: "John Doe", // from hard-coded profiles
            userAvatar: "https://...", // from hard-coded profiles
            comment: "Great photo!",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z"
        }
    ],
    cachedAt: "2024-01-01T00:00:00Z",
    ttl: 300
}
```

#### `swiss-album-realtime`
Real-time collaboration and live updates.
```javascript
// Key format: album:{album_id}:active_users
{
    users: [
        {
            userId: "user_123",
            name: "John Doe",
            avatar: "...",
            lastSeen: "2024-01-01T00:00:00Z",
            currentPage: "day_1"
        }
    ],
    editLocks: {
        "event_456": {
            userId: "user_123",
            lockedAt: "2024-01-01T00:00:00Z"
        }
    },
    recentActivity: [
        {
            type: "comment_added",
            userId: "user_123",
            userName: "John Doe",
            mediaId: "media_456",
            commentId: "comment_789",
            timestamp: "2024-01-01T00:00:00Z"
        },
        {
            type: "media_uploaded",
            userId: "user_123",
            userName: "John Doe",
            eventId: "event_456",
            mediaId: "media_789",
            mediaType: "photo",
            timestamp: "2024-01-01T00:00:00Z"
        }
    ]
}
```

## API Endpoints (Cloudflare Workers)

### Authentication Routes
- `POST /api/auth/register` - User registration (user ID + password)
- `POST /api/auth/login` - User login (user ID + password)
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info (includes hard-coded profile data)

### Album Management
- `GET /api/albums` - List user's albums
- `POST /api/albums` - Create new album
- `GET /api/albums/:id` - Get album details
- `PUT /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album
- `POST /api/albums/:id/participants` - Add participant
- `DELETE /api/albums/:id/participants/:userId` - Remove participant

### Trip Days
- `GET /api/albums/:albumId/days` - Get all days for album
- `POST /api/albums/:albumId/days` - Create new day
- `PUT /api/days/:id` - Update day
- `DELETE /api/days/:id` - Delete day
- `PUT /api/days/reorder` - Reorder days

### Events
- `GET /api/days/:dayId/events` - Get events for day
- `POST /api/days/:dayId/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `PUT /api/events/reorder` - Reorder events
- `POST /api/events/:id/participants` - Add event participant
- `DELETE /api/events/:id/participants/:userId` - Remove event participant

### Media Management
- `POST /api/events/:id/media` - Upload media to event (includes uploader info)
- `DELETE /api/media/:id` - Delete media
- `PUT /api/media/reorder` - Reorder media
- `GET /api/media/:id/download` - Download original media
- `GET /api/media/:id/thumbnail` - Get thumbnail
- `GET /api/media/:id/details` - Get media details including uploader and comments

### Comments
- `GET /api/media/:id/comments` - Get all comments for media
- `POST /api/media/:id/comments` - Add comment to media
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Real-time Features
- `GET /api/albums/:id/active-users` - Get active users
- `POST /api/albums/:id/presence` - Update user presence
- `POST /api/events/:id/lock` - Lock event for editing
- `DELETE /api/events/:id/lock` - Release edit lock
- `GET /api/albums/:id/activity` - Get recent activity feed
- `POST /api/albums/:id/activity` - Add activity notification

## Environment Variables

```bash
# Database
DATABASE_URL="your-d1-database-url"

# R2 Storage
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="swiss-album-media"

# KV Namespaces
KV_SESSIONS_ID="your-sessions-kv-id"
KV_CACHE_ID="your-cache-kv-id"
KV_REALTIME_ID="your-realtime-kv-id"

# Authentication
JWT_SECRET="your-jwt-secret"
SESSION_DURATION="86400" # 24 hours in seconds

# Image Processing
MAX_FILE_SIZE="10485760" # 10MB
ALLOWED_IMAGE_TYPES="image/jpeg,image/png,image/webp"
ALLOWED_VIDEO_TYPES="video/mp4,video/webm"
THUMBNAIL_SIZES="150x150,300x300,600x600"
```