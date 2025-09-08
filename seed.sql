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