export interface TripDay {
  id: string;
  date: string;
  title: string;
  heroPhoto: string;
  heroVideo?: string;
  photoCount: number;
  participants: Participant[];
  events: TripEvent[];
  backgroundColor: string;
}

export interface MediaComment {
  id: string;
  mediaId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface MediaItem {
  url: string;
  uploader: {
    id: string;
    name: string;
    avatar: string;
  };
  comments?: MediaComment[];
}

export interface TripEvent {
  id: string;
  name: string;
  description: string;
  location?: string;
  emoji: string;
  photos: MediaItem[];
  videos: MediaItem[];
  participants: Participant[];
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
}