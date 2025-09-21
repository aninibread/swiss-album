import type { Route } from "./+types/home";
import React, { useState, useEffect, useRef } from "react";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { createPortal } from 'react-dom';
import { api } from '../services/api';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Swiss Adventure Album 🇨🇭" },
    { name: "description", content: "Our amazing group trip to Switzerland!" },
  ];
}

interface TripDay {
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

interface MediaItem {
  url: string;
  uploader: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface TripEvent {
  id: string;
  name: string;
  description: string;
  location?: string;
  emoji: string;
  photos: MediaItem[];
  videos: MediaItem[];
  participants: Participant[];
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
}


// Simple video component with proper container sizing
const VideoContainer: React.FC<{
  src: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onClick?: () => void;
  [key: string]: any;
}> = ({ src, className, onError, onClick, ...props }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const ratio = video.videoWidth / video.videoHeight;
    setAspectRatio(ratio);
    props.onLoadedMetadata?.(e);
  };

  return (
    <div 
      style={{
        width: 'fit-content',
        maxWidth: '100%',
        aspectRatio: aspectRatio ? aspectRatio.toString() : undefined,
        margin: '0 auto'
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        onError={onError}
        onClick={onClick}
        onLoadedMetadata={handleLoadedMetadata}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        {...props}
      />
    </div>
  );
};

export default function Home() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUserId, setLoginUserId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Album data state
  const [tripDays, setTripDays] = useState<TripDay[]>([]);
  const [albumData, setAlbumData] = useState<any>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);

  // UI state
  const [activeDay, setActiveDay] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<string>("");
  const [editingEvent, setEditingEvent] = useState<string>("");
  const [savingEvent, setSavingEvent] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");
  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
  const [editingDay, setEditingDay] = useState<string>("");
  const [editDayTitle, setEditDayTitle] = useState<string>("");
  const [editDayDate, setEditDayDate] = useState<string>("");
  const [draggedEvent, setDraggedEvent] = useState<{dayId: string, eventId: string} | null>(null);
  const [editEmoji, setEditEmoji] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string>("");
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{top: number, left: number} | null>(null);
  const emojiButtonRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});
  const [showAddParticipant, setShowAddParticipant] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{url: string; uploader?: {id: string; name: string; avatar: string}; eventId?: string; dayId?: string; type?: 'photo' | 'video'} | null>(null);
  const [addParticipantPosition, setAddParticipantPosition] = useState<{top: number, left: number} | null>(null);
  const addParticipantButtonRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});
  const [showDatePicker, setShowDatePicker] = useState<string>("");
  const [datePickerPosition, setDatePickerPosition] = useState<{top: number, left: number} | null>(null);
  const [datePickerMonth, setDatePickerMonth] = useState<{year: number, month: number}>({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const datePickerButtonRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState<boolean>(false);
  const [locationInputRef, setLocationInputRef] = useState<HTMLInputElement | null>(null);
  const [locationDropdownPosition, setLocationDropdownPosition] = useState<{top: number, left: number, width: number} | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const credentials = api.getCredentials();
    if (credentials.userId && credentials.password) {
      setIsAuthenticated(true);
      loadAlbumData();
    }
  }, []);

  // Close emoji picker when clicking outside or scrolling
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.emoji-picker-container') && !target.closest('[data-emoji-picker]')) {
        setShowEmojiPicker("");
        setEmojiPickerPosition(null);
      }
    };

    const handleScroll = () => {
      setShowEmojiPicker("");
      setEmojiPickerPosition(null);
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [showEmojiPicker]);

  // Close add participant dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.add-participant-dropdown') && !target.closest('[data-participant-dropdown]')) {
        setShowAddParticipant("");
        setAddParticipantPosition(null);
      }
    };

    const handleScroll = () => {
      setShowAddParticipant("");
      setAddParticipantPosition(null);
    };

    if (showAddParticipant) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [showAddParticipant]);

  // Close date picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.date-picker-dropdown') && !target.closest('[data-date-picker]')) {
        setShowDatePicker("");
        setDatePickerPosition(null);
      }
    };

    const handleScroll = () => {
      setShowDatePicker("");
      setDatePickerPosition(null);
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [showDatePicker]);

  // Close location suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.location-autocomplete') && !target.closest('[data-location-dropdown]') && showLocationSuggestions) {
        setShowLocationSuggestions(false);
        setLocationDropdownPosition(null);
      }
    };

    const handleScroll = () => {
      if (showLocationSuggestions) {
        setShowLocationSuggestions(false);
        setLocationDropdownPosition(null);
      }
    };

    if (showLocationSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [showLocationSuggestions]);

  // Debounce location search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (editLocation && editingEvent) {
        fetchLocationSuggestions(editLocation);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [editLocation]);

  // Scroll tracking
  React.useEffect(() => {
    if (!isAuthenticated || tripDays.length === 0) return;
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      
      for (const day of tripDays) {
        const dayElement = document.getElementById(`day-${day.id}`);
        if (dayElement) {
          const dayRect = dayElement.getBoundingClientRect();
          const dayTop = dayRect.top + window.scrollY;
          const dayBottom = dayTop + dayRect.height;
          
          if (scrollPosition >= dayTop && scrollPosition < dayBottom) {
            setActiveDay(day.id);
            
            for (const event of day.events) {
              const eventElement = document.getElementById(`event-${event.id}`);
              if (eventElement) {
                const eventRect = eventElement.getBoundingClientRect();
                const eventTop = eventRect.top + window.scrollY;
                const eventBottom = eventTop + eventRect.height;
                
                if (scrollPosition >= eventTop && scrollPosition < eventBottom) {
                  setActiveEvent(event.id);
                  break;
                }
              }
            }
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tripDays, isAuthenticated]);

  const loadAlbumData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getAlbumFull('album-1');
      setAlbumData(data);
      setTripDays(data.days || []);
      setAllParticipants(data.participants || []);
      if (data.days?.length > 0) {
        setActiveDay(data.days[0].id);
      }
    } catch (err) {
      setError('Failed to load album data');
      console.error('Error loading album:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const result = await api.login(loginUserId, loginPassword);
      if (result.success) {
        setIsAuthenticated(true);
        await loadAlbumData();
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearCredentials();
    setIsAuthenticated(false);
    setTripDays([]);
    setAlbumData(null);
    setAllParticipants([]);
    setLoginUserId("");
    setLoginPassword("");
    setError("");
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100 to-stone-forest/20 flex items-center justify-center p-4" style={{
        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)'
      }}>
        <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-stone-forest/20 rounded-2xl flex items-center justify-center mb-4 border border-stone-forest/30">
                <span className="text-2xl">🇨🇭</span>
              </div>
              <h1 className="text-3xl font-display font-bold text-stone-900 tracking-tight mb-2">Swiss Adventure</h1>
              <p className="text-stone-600 font-medium">Sign in to view our amazing journey</p>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6" suppressHydrationWarning>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3 font-display">User ID</label>
              <input
                type="text"
                value={loginUserId}
                onChange={(e) => setLoginUserId(e.target.value)}
                className="w-full px-4 py-4 bg-white/60 backdrop-blur-sm border border-stone-300/40 rounded-2xl focus:ring-2 focus:ring-stone-forest/30 focus:border-stone-forest/50 transition-all placeholder-stone-400 font-medium shadow-sm hover:bg-white/70"
                placeholder="Enter your user ID"
                required
                suppressHydrationWarning
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3 font-display">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-4 bg-white/60 backdrop-blur-sm border border-stone-300/40 rounded-2xl focus:ring-2 focus:ring-stone-forest/30 focus:border-stone-forest/50 transition-all placeholder-stone-400 font-medium shadow-sm hover:bg-white/70"
                placeholder="Enter your password"
                required
                suppressHydrationWarning
              />
            </div>

            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-2xl p-4 text-red-700 text-sm font-medium shadow-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-stone-forest hover:bg-stone-forest/90 disabled:bg-stone-300 text-white font-medium py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl font-display tracking-wide disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="bg-stone-forest/10 backdrop-blur-sm rounded-2xl p-4 border border-stone-forest/20">
              <p className="text-xs text-stone-600 font-medium mb-1">Try these credentials:</p>
              <p className="text-sm text-stone-800 font-mono bg-white/40 rounded-lg px-3 py-2 border border-stone-200/50">
                <strong>anni</strong> / ilovelaswiss
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Swiss adventure...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !albumData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={loadAlbumData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get unique participants from a day's events
  const getDayParticipants = (day: any) => {
    const uniqueParticipants = new Map();
    
    day.events.forEach((event: any) => {
      event.participants.forEach((participant: any) => {
        uniqueParticipants.set(participant.id, participant);
      });
    });
    
    return Array.from(uniqueParticipants.values());
  };

  // Get random highlights from all event media
  const getRandomHighlights = () => {
    const allMedia: Array<{url: string; uploader?: any; eventName: string; dayTitle: string; type: 'photo' | 'video'}> = [];
    
    tripDays.forEach(day => {
      day.events.forEach(event => {
        // Add photos
        event.photos.forEach(photo => {
          allMedia.push({
            url: typeof photo === 'string' ? photo : photo.url,
            uploader: typeof photo === 'object' ? photo.uploader : undefined,
            eventName: event.name,
            dayTitle: day.title,
            type: 'photo'
          });
        });
        
        // Add videos
        event.videos.forEach(video => {
          allMedia.push({
            url: typeof video === 'string' ? video : video.url,
            uploader: typeof video === 'object' ? video.uploader : undefined,
            eventName: event.name,
            dayTitle: day.title,
            type: 'video'
          });
        });
      });
    });
    
    // Shuffle array and take first 4
    const shuffled = [...allMedia].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  };

  const addPhotosToEvent = async (dayId: string, eventId: string, files: FileList) => {
    try {
      // Show loading state with temporary URLs
      const fileArray = Array.from(files);
      const tempUrls: string[] = [];
      const tempPhotos: string[] = [];
      const tempVideos: string[] = [];
      
      fileArray.forEach(file => {
        const url = URL.createObjectURL(file);
        tempUrls.push(url);
        if (file.type.startsWith('video/')) {
          tempVideos.push(url);
        } else {
          tempPhotos.push(url);
        }
      });
      
      // Update UI immediately with temporary URLs (as strings for temp display)
      setTripDays(prev => prev.map(day => 
        day.id === dayId 
          ? { 
              ...day,
              photoCount: day.photoCount + fileArray.length,
              events: day.events.map(event => 
                event.id === eventId 
                  ? { 
                      ...event,
                      photos: [...event.photos, ...tempPhotos],
                      videos: [...event.videos, ...tempVideos]
                    }
                  : event
              )
            }
          : day
      ));

      // Upload to backend
      const result = await api.uploadMedia(eventId, files);
      
      if (result.success) {
        // Get current user info for uploader avatar
        const currentUser = api.getCredentials();
        const uploaderInfo = {
          id: currentUser.userId || 'unknown',
          name: currentUser.userId || 'Unknown User',
          avatar: `https://picsum.photos/80/80?random=${(currentUser.userId || 'unknown').length}`
        };
        
        // Replace temporary URLs with MediaItem objects
        const realPhotos = result.files.filter((f: any) => f.type === 'photo').map((f: any) => ({
          url: f.url,
          uploader: uploaderInfo
        }));
        const realVideos = result.files.filter((f: any) => f.type === 'video').map((f: any) => ({
          url: f.url,
          uploader: uploaderInfo
        }));
        
        setTripDays(prev => prev.map(day => 
          day.id === dayId 
            ? { 
                ...day,
                events: day.events.map(event => 
                  event.id === eventId 
                    ? { 
                        ...event,
                        photos: [
                          ...event.photos.filter(photo => 
                            typeof photo === 'string' ? !tempPhotos.includes(photo) : true
                          ),
                          ...realPhotos
                        ],
                        videos: [
                          ...event.videos.filter(video => 
                            typeof video === 'string' ? !tempVideos.includes(video) : true
                          ),
                          ...realVideos
                        ]
                      }
                    : event
                )
              }
            : day
        ));

        // Clean up temporary URLs
        tempUrls.forEach(url => URL.revokeObjectURL(url));
      }
    } catch (error) {
      console.error('Failed to upload media:', error);
      setError('Failed to upload files');
      
      // If upload fails, we could optionally remove the temporary URLs
      // or leave them as a fallback for offline viewing
    }
  };

  const handleDeleteMedia = async (dayId?: string, eventId?: string, mediaUrl?: string) => {
    // Use passed parameters or fallback to selectedMedia
    const targetDayId = dayId || selectedMedia?.dayId;
    const targetEventId = eventId || selectedMedia?.eventId;
    const targetUrl = mediaUrl || selectedMedia?.url;
    
    if (!targetDayId || !targetEventId || !targetUrl) return;
    
    try {
      // Extract media ID from URL
      const mediaId = targetUrl.split('/').pop();
      if (!mediaId) return;
      
      await api.deleteMedia(mediaId);
      
      // Remove from UI
      setTripDays(prev => prev.map(day => 
        day.id === targetDayId 
          ? {
              ...day,
              events: day.events.map(event => 
                event.id === targetEventId 
                  ? {
                      ...event,
                      photos: event.photos.filter(photo => 
                        (typeof photo === 'string' ? photo : photo.url) !== targetUrl
                      ),
                      videos: event.videos.filter(video => 
                        (typeof video === 'string' ? video : video.url) !== targetUrl
                      )
                    }
                  : event
              )
            }
          : day
      ));
      
      // Close modal if it was open
      if (selectedImage === targetUrl) {
        setSelectedImage(null);
        setSelectedMedia(null);
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      setError('Failed to delete media: ' + (error as Error).message);
    }
  };

  const startEditingEvent = (eventId: string, currentName: string, currentDescription: string, currentEmoji: string, currentLocation?: string) => {
    setEditingEvent(eventId);
    setEditTitle(currentName);
    setEditDescription(currentDescription);
    setEditEmoji(currentEmoji);
    setEditLocation(currentLocation || "");
  };

  const saveEventEdit = async (dayId: string, eventId: string) => {
    if (savingEvent === eventId) return; // Prevent double-saves
    
    setSavingEvent(eventId);
    
    // Store current values for potential rollback
    const currentEvent = tripDays.find(day => day.id === dayId)?.events.find(event => event.id === eventId);
    const updateData = {
      name: editTitle,
      description: editDescription,
      emoji: editEmoji,
      location: editLocation || undefined
    };
    
    // Optimistic update - update UI immediately
    setTripDays(prev => prev.map(day => 
      day.id === dayId 
        ? { 
            ...day,
            events: day.events.map(event => 
              event.id === eventId 
                ? { ...event, ...updateData }
                : event
            )
          }
        : day
    ));
    
    // Exit edit mode immediately for better UX
    setEditingEvent("");
    setEditTitle("");
    setEditDescription("");
    setEditEmoji("");
    setEditLocation("");
    setIsEditingDescription(false);
    setShowEmojiPicker("");
    
    try {
      await api.updateEvent(eventId, updateData);
    } catch (error) {
      console.error('Failed to update event:', error);
      setError('Failed to update event');
      
      // Rollback on error
      if (currentEvent) {
        setTripDays(prev => prev.map(day => 
          day.id === dayId 
            ? { 
                ...day,
                events: day.events.map(event => 
                  event.id === eventId ? currentEvent : event
                )
              }
            : day
        ));
      }
    } finally {
      setSavingEvent("");
    }
  };

  const cancelEventEdit = () => {
    setEditingEvent("");
    setEditTitle("");
    setEditDescription("");
    setEditEmoji("");
    setEditLocation("");
    setIsEditingDescription(false);
    setShowEmojiPicker("");
  };

  const startEditingDay = (dayId: string, title: string, date: string) => {
    setEditingDay(dayId);
    setEditDayTitle(title);
    setEditDayDate(date);
  };

  const saveDayEdit = async (dayId: string) => {
    try {
      
      // Validate inputs
      if (!editDayTitle.trim()) {
        setError('Day title cannot be empty');
        return;
      }
      
      if (!editDayDate) {
        setError('Please select a date');
        return;
      }
      
      await api.updateTripDay(dayId, {
        title: editDayTitle.trim(),
        date: editDayDate
      });
      
      // Update local state and reorder chronologically if date changed
      setTripDays(prev => {
        const updatedDays = prev.map(day => 
          day.id === dayId 
            ? { ...day, title: editDayTitle.trim(), date: editDayDate }
            : day
        );
        
        // Sort chronologically by date to maintain correct order
        return updatedDays.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
      });
      
      setEditingDay("");
      setEditDayTitle("");
      setEditDayDate("");
      setError(""); // Clear any previous errors
    } catch (error) {
      console.error('Failed to update day:', error);
      setError('Failed to update day: ' + (error as Error).message);
    }
  };

  const cancelDayEdit = () => {
    setEditingDay("");
    setEditDayTitle("");
    setEditDayDate("");
  };

  const addNewEvent = async (dayId: string) => {
    try {
      const day = tripDays.find(d => d.id === dayId);
      const sortOrder = day ? day.events.length : 0;
      
      const result = await api.createEvent(dayId, {
        name: "New Event",
        description: "Add a description for this event",
        emoji: "✨",
        location: "Add location",
        sortOrder,
        participantIds: allParticipants.map(p => p.id)
      });
      
      const newEvent: TripEvent = {
        id: result.eventId,
        name: "New Event",
        description: "Add a description for this event",
        emoji: "✨",
        location: "Add location",
        photos: [],
        videos: [],
        participants: [...allParticipants]
      };
      
      // Update local state after successful API call
      setTripDays(prev => prev.map(day => 
        day.id === dayId 
          ? { ...day, events: [...day.events, newEvent] }
          : day
      ));
      
      // Immediately start editing the new event
      startEditingEvent(newEvent.id, newEvent.name, newEvent.description, newEvent.emoji, "Add location");
    } catch (error) {
      console.error('Failed to create event:', error);
      setError('Failed to create event');
    }
  };

  const deleteEvent = async (dayId: string, eventId: string) => {
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      try {
        await api.deleteEvent(eventId);
        
        // Update local state after successful API call
        setTripDays(prev => prev.map(day => 
          day.id === dayId 
            ? { ...day, events: day.events.filter(event => event.id !== eventId) }
            : day
        ));
        
        // Cancel any ongoing edit if this event was being edited
        if (editingEvent === eventId) {
          cancelEventEdit();
        }
      } catch (error) {
        console.error('Failed to delete event:', error);
        setError('Failed to delete event');
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, dayId: string, eventId: string) => {
    setDraggedEvent({ dayId, eventId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback to the drop target
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent, targetDayId: string, targetEventId?: string) => {
    e.preventDefault();
    
    // Remove visual feedback
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    
    if (!draggedEvent) return;
    
    const { dayId: sourceDayId, eventId: sourceEventId } = draggedEvent;
    
    if (sourceDayId === targetDayId && sourceEventId === targetEventId) {
      setDraggedEvent(null);
      return;
    }

    setTripDays(prev => {
      const newDays = [...prev];
      
      // Find source day and event
      const sourceDayIndex = newDays.findIndex(day => day.id === sourceDayId);
      const sourceEventIndex = newDays[sourceDayIndex].events.findIndex(event => event.id === sourceEventId);
      const eventToMove = newDays[sourceDayIndex].events[sourceEventIndex];
      
      // Remove from source
      newDays[sourceDayIndex].events.splice(sourceEventIndex, 1);
      
      // Find target day and position
      const targetDayIndex = newDays.findIndex(day => day.id === targetDayId);
      
      if (targetEventId) {
        // Insert before target event
        const targetEventIndex = newDays[targetDayIndex].events.findIndex(event => event.id === targetEventId);
        newDays[targetDayIndex].events.splice(targetEventIndex, 0, eventToMove);
      } else {
        // Add to end of day
        newDays[targetDayIndex].events.push(eventToMove);
      }
      
      return newDays;
    });
    
    setDraggedEvent(null);
  };

  const handleEmojiSelect = (emoji: any) => {
    const emojiChar = emoji.native;
    setEditEmoji(emojiChar);
    setShowEmojiPicker("");
    setEmojiPickerPosition(null);
  };

  const handleEmojiSelectDirect = (emoji: any, eventId: string) => {
    const emojiChar = emoji.native;
    setTripDays(prev => prev.map(day => ({
      ...day,
      events: day.events.map(event => 
        event.id === eventId 
          ? { ...event, emoji: emojiChar }
          : event
      )
    })));
    setShowEmojiPicker("");
    setEmojiPickerPosition(null);
  };

  const openEmojiPicker = (eventId: string) => {
    if (showEmojiPicker === eventId) {
      // Close if clicking the same emoji button
      setShowEmojiPicker("");
      setEmojiPickerPosition(null);
      return;
    }
    
    const button = emojiButtonRefs.current[eventId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setEmojiPickerPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setShowEmojiPicker(eventId);
  };

  const openAddParticipantDropdown = (eventId: string) => {
    if (showAddParticipant === eventId) {
      // Close if clicking the same button
      setShowAddParticipant("");
      setAddParticipantPosition(null);
      return;
    }
    
    const button = addParticipantButtonRefs.current[eventId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setAddParticipantPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setShowAddParticipant(eventId);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setDatePickerMonth(prev => {
      const newMonth = direction === 'next' ? prev.month + 1 : prev.month - 1;
      const newYear = prev.year + Math.floor(newMonth / 12) - Math.floor((newMonth < 0 ? -1 : 0));
      const adjustedMonth = ((newMonth % 12) + 12) % 12;
      return { year: newYear, month: adjustedMonth };
    });
  };

  const openDatePicker = (dayId: string) => {
    if (showDatePicker === dayId) {
      setShowDatePicker("");
      setDatePickerPosition(null);
      return;
    }
    
    // Reset to current month when opening
    const now = new Date();
    setDatePickerMonth({ year: now.getFullYear(), month: now.getMonth() });
    
    const button = datePickerButtonRefs.current[dayId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setDatePickerPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setShowDatePicker(dayId);
  };

  const handleDateSelect = (date: string, dayId: string) => {
    setEditDayDate(date);
    setShowDatePicker("");
    setDatePickerPosition(null);
  };



  const addParticipantToEvent = async (dayId: string, eventId: string, participantId: string) => {
    try {
      await api.updateEventParticipants(eventId, participantId, 'add');
      
      // Update local state after successful API call
      setTripDays(prev => prev.map(day => 
        day.id === dayId 
          ? {
              ...day,
              events: day.events.map(event => 
                event.id === eventId 
                  ? {
                      ...event,
                      participants: event.participants.some(p => p.id === participantId)
                        ? event.participants // Don't add if already exists
                        : [...event.participants, allParticipants.find(p => p.id === participantId)].filter((p): p is Participant => p !== undefined)
                    }
                  : event
              )
            }
          : day
      ));
    } catch (error) {
      console.error('Failed to add participant:', error);
      setError('Failed to add participant');
    }
  };

  const removeParticipantFromEvent = async (dayId: string, eventId: string, participantId: string) => {
    try {
      await api.updateEventParticipants(eventId, participantId, 'remove');
      
      // Update local state after successful API call
      setTripDays(prev => prev.map(day => 
        day.id === dayId 
          ? {
              ...day,
              events: day.events.map(event => 
                event.id === eventId 
                  ? {
                      ...event,
                      participants: event.participants.filter(p => p.id !== participantId)
                    }
                  : event
              )
            }
          : day
      ));
    } catch (error) {
      console.error('Failed to remove participant:', error);
      setError('Failed to remove participant');
    }
  };

  const addNewDay = async () => {
    try {
      const today = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      const result = await api.createTripDay('album-1', {
        title: 'New Day',
        date: today
      });
      
      if (!result.dayId) {
        throw new Error('No dayId returned from API');
      }
      
      // Create new day object
      const newDay: TripDay = {
        id: result.dayId,
        date: today,
        title: 'New Day',
        heroPhoto: "https://picsum.photos/800/600?random=" + Math.floor(Math.random() * 1000),
        photoCount: 0,
        backgroundColor: "bg-blue-100",
        participants: allParticipants,
        events: []
      };
      
      // Insert new day in correct chronological position
      setTripDays(prev => {
        const allDays = [...prev, newDay];
        // Sort chronologically by date
        return allDays.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
      });
      
      // Immediately start editing the new day
      setEditingDay(result.dayId);
      setEditDayTitle('New Day');
      setEditDayDate(today);
      
      // Scroll to the new day
      setTimeout(() => {
        document.getElementById(`day-${result.dayId}`)?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
      
    } catch (error) {
      console.error('Failed to create day - detailed error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        setError(`Failed to create day: ${error.message}`);
      } else {
        setError('Failed to create day: Unknown error');
      }
    }
  };

  const deleteDay = async (dayId: string) => {
    const day = tripDays.find(d => d.id === dayId);
    if (!day) return;
    
    // Check if day has events
    if (day.events.length > 0) {
      setError('Cannot delete a day that has events');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${day.title}"? This action cannot be undone.`)) {
      try {
        await api.deleteTripDay(dayId);
        
        // Update local state after successful API call
        setTripDays(prev => prev.filter(d => d.id !== dayId));
        
        // Cancel any ongoing edit if this day was being edited
        if (editingDay === dayId) {
          setEditingDay("");
          setEditDayTitle("");
          setEditDayDate("");
        }
        
        // Clear active day if this was the active one
        if (activeDay === dayId) {
          setActiveDay(tripDays.length > 1 ? tripDays[0].id : "");
        }
        
      } catch (error) {
        console.error('Failed to delete day:', error);
        if (error instanceof Error && error.message.includes('Cannot delete day with events')) {
          setError('Cannot delete a day that has events');
        } else {
          setError('Failed to delete day');
        }
      }
    }
  };



  const scrollToDay = (dayId: string) => {
    document.getElementById(`day-${dayId}`)?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const scrollToEvent = (eventId: string) => {
    document.getElementById(`event-${eventId}`)?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'center'
    });
  };

  const fetchLocationSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/location/autocomplete?query=${encodeURIComponent(query)}`,
        { method: 'GET' }
      );
      const result = await response.json();
      
      if (result.features) {
        setLocationSuggestions(result.features.slice(0, 5)); // Limit to 5 suggestions
        setShowLocationSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  };

  const handleLocationSelect = (feature: any) => {
    const locationName = feature.properties.formatted || feature.properties.name;
    setEditLocation(locationName);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    setLocationDropdownPosition(null);
  };

  return (
    <>
      <style>{`
        [title] {
          position: relative;
        }
        [title]:hover::after {
          content: attr(title);
          position: absolute;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 10000;
          animation: tooltipFadeIn 0.1s ease-in;
        }
        @keyframes tooltipFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {/* Fixed Background */}
      <div className="fixed inset-0 -z-10" style={{
        background: 'linear-gradient(to right, rgb(240 250 235) 10%, rgb(230 245 250) 25%, rgb(201 220 235) 60%, rgb(200 220 200) 85%)'
      }}></div>
      
      <div className="min-h-screen text-stone-800">
      <div className="max-w-7xl mx-auto flex">
        {/* Side Navigation */}
        <div className="w-80 sticky top-1/3 transform -translate-y-1/3 h-fit overflow-y-auto">
          <div className="p-8">
            <div className="space-y-3">
              {tripDays.map((day, dayIndex) => (
                <div key={day.id}>
                  <button
                    onClick={() => scrollToDay(day.id)}
                    className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                      activeDay === day.id 
                        ? 'bg-white/30 text-stone-900 font-medium shadow-sm backdrop-blur-sm' 
                        : 'text-stone-800 hover:bg-white/20 hover:backdrop-blur-sm'
                    }`}
                  >
                    <div className="text-base">{day.date}</div>
                    <div className="text-xs text-stone-600 mt-0.5">{day.title}</div>
                  </button>
                  
                  {/* Events list for active day */}
                  {activeDay === day.id && (
                    <div className="ml-4 mt-2 space-y-2">
                      {day.events.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => scrollToEvent(event.id)}
                          className={`w-full text-left py-1 px-2 rounded-lg text-sm transition-all ${
                            activeEvent === event.id
                              ? 'bg-bright-sky/20 text-stone-900 font-medium backdrop-blur-sm'
                              : 'text-stone-600 hover:bg-bright-sky/15 hover:backdrop-blur-sm hover:text-stone-800'
                          }`}
                        >
                          <span className="mr-2">{event.emoji}</span>
                          {event.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
        {/* Album Header */}
        <div className="px-4 py-6">
          <div className="bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-display font-semibold text-stone-900 mb-1">Swiss Adventure</h1>
                  <p className="text-stone-600">July 2024 · 136 photos</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="opacity-30 hover:opacity-70 text-stone-600 hover:text-stone-800 p-2 rounded-lg transition-all duration-300 hover:bg-stone-200/30 group"
                  title="Sign out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="border-t border-stone-forest/30 pt-6">
            <div className="flex gap-8">
              {/* Featured Photos */}
              <div className="flex-[2]">
                <h3 className="text-lg font-display font-medium text-stone-900 mb-3">Trip Highlights</h3>
                <div className="columns-1 sm:columns-2 gap-3 space-y-3" style={{columnFill: 'balance'}}>
                  {getRandomHighlights().map((media, index) => (
                    <div key={`highlight-${media.url}-${index}`} className="break-inside-avoid mb-3 bg-white/50 backdrop-blur-sm rounded-2xl overflow-hidden hover:scale-105 transition-all cursor-pointer shadow-sm border border-stone-forest/30 relative">
                      {media.type === 'video' ? (
                        <VideoContainer
                          src={media.url}
                          className="w-full h-auto object-contain"
                          controls
                          preload="metadata"
                          playsInline
                          muted
                          style={{ 
                            maxWidth: '100%',
                            height: 'auto',
                            aspectRatio: 'auto'
                          }}
                        />
                      ) : (
                        <img
                          src={media.url}
                          alt={`${media.eventName} from ${media.dayTitle}`}
                          className="w-full h-auto object-contain"
                          loading="lazy"
                          decoding="async"
                          onClick={() => setSelectedImage(media.url)}
                          style={{ 
                            maxWidth: '100%',
                            height: 'auto',
                            aspectRatio: 'auto'
                          }}
                        />
                      )}
                      {/* Show uploader avatar if available */}
                      {media.uploader && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full overflow-hidden border-2 border-white/80 shadow-sm">
                          <img
                            src={media.uploader.avatar}
                            alt={media.uploader.name}
                            className="w-full h-full object-cover"
                            title={`Uploaded by ${media.uploader.name}`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Map and Participants */}
              <div className="w-64">
                <h3 className="text-lg font-display font-medium text-stone-900 mb-3">Our Journey</h3>
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 h-48 border border-stone-forest/30 shadow-sm mb-4">
                  <div className="relative w-full h-full bg-gradient-to-br from-stone-forest/30 to-stone-forest/40 rounded-xl overflow-hidden">
                    {/* Switzerland Map Representation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-stone-forest text-center">
                        <div className="text-xs font-medium mb-2">SWITZERLAND</div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-center">
                            <div className="w-2 h-2 bg-stone-forest rounded-full mr-2 shadow-sm"></div>
                            <span className="text-xs">Zurich</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <div className="w-2 h-2 bg-stone-forest rounded-full mr-2 shadow-sm"></div>
                            <span className="text-xs">Lucerne</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <div className="w-2 h-2 bg-stone-forest rounded-full mr-2 shadow-sm"></div>
                            <span className="text-xs">Jungfraujoch</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Location pins */}
                    <div className="absolute top-4 left-1/2 w-3 h-3 bg-stone-forest rounded-full border-2 border-white shadow-md"></div>
                    <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-stone-forest rounded-full border-2 border-white shadow-md"></div>
                    <div className="absolute bottom-6 right-1/3 w-3 h-3 bg-stone-forest rounded-full border-2 border-white shadow-md"></div>
                  </div>
                </div>
                
                {/* Participants */}
                <div>
                  <h4 className="text-sm font-medium text-stone-700 mb-2">Participants</h4>
                  <div className="space-y-2">
                    {allParticipants.map((participant) => (
                      <div key={participant.id} className="flex items-center space-x-2">
                        <img
                          src={participant.avatar}
                          alt={participant.name}
                          className="w-8 h-8 rounded-full border border-stone-forest/30"
                          title={participant.name}
                        />
                        <span className="text-xs text-stone-600">{participant.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All Photos View */}
        <div className="px-4 py-6">
          {tripDays.map((day, dayIndex) => (
            <div key={day.id} id={`day-${day.id}`} className="mb-12">
            {/* Day Section Header - Sticky */}
            <div className="sticky top-0 z-40 bg-white/30 backdrop-blur-lg border-2 border-white/40 rounded-3xl shadow-xl mb-8 -mx-4 mx-0 px-8 py-6 group">
              <div className="flex items-center justify-between mb-3 relative">
                {editingDay === day.id ? (
                  <>
                    <input
                      type="text"
                      value={editDayTitle}
                      onChange={(e) => setEditDayTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveDayEdit(day.id);
                        } else if (e.key === 'Escape') {
                          cancelDayEdit();
                        }
                      }}
                      className="text-2xl font-display font-bold text-stone-900 tracking-tight bg-transparent border-none outline-none focus:outline-none resize-none hover:bg-white/10 focus:bg-white/10 rounded px-2 py-1 -mx-2 -my-1"
                      placeholder="Day title..."
                      autoFocus
                    />
                    <div className="flex items-center space-x-3">
                      <div className="relative date-picker-dropdown">
                        <button
                          ref={(el) => datePickerButtonRefs.current[day.id] = el}
                          onClick={() => openDatePicker(day.id)}
                          className="text-sm font-medium text-stone-800 bg-stone-forest/20 px-3 py-1 rounded-full border-none outline-none focus:outline-none hover:bg-stone-forest/30 focus:bg-stone-forest/30 cursor-pointer"
                          data-date-picker
                        >
                          {editDayDate || "Select date"}
                        </button>
                      </div>
                      <button
                        onClick={() => saveDayEdit(day.id)}
                        className="p-1 rounded-lg hover:bg-stone-200/50 transition-colors"
                        title="Save changes"
                      >
                        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-display font-bold text-stone-900 tracking-tight">{day.title}</h2>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-stone-800 bg-stone-forest/20 px-3 py-1 rounded-full">{day.date}</span>
                      <div className="flex items-center space-x-1">
                        {day.events.length === 0 && (
                          <button
                            onClick={() => deleteDay(day.id)}
                            className="p-1 rounded-lg hover:bg-red-200/50 transition-colors"
                            title="Delete day (only available when no events)"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => startEditingDay(day.id, day.title, day.date)}
                          className="p-1 rounded-lg hover:bg-stone-200/50 transition-colors"
                          title="Edit day"
                        >
                          <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-8 text-sm text-stone-700 font-medium">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-stone-forest rounded-full mr-2"></div>
                  {day.photoCount} photos
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-stone-forest rounded-full mr-2"></div>
                  {day.events.length} events
                </span>
                {/* Day participants */}
                {getDayParticipants(day).length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center -space-x-2">
                      {getDayParticipants(day).slice(0, 5).map((participant: any, index: number) => (
                        <div
                          key={participant.id}
                          className="w-5 h-5 rounded-full border-2 border-white/80 shadow-sm overflow-hidden bg-white/20 backdrop-blur-sm"
                          style={{ zIndex: 10 - index }}
                          title={participant.name}
                        >
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {getDayParticipants(day).length > 5 && (
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white/80 shadow-sm bg-stone-200/80 backdrop-blur-sm flex items-center justify-center"
                          style={{ zIndex: 5 }}
                          title={`+${getDayParticipants(day).length - 5} more participants`}
                        >
                          <span className="text-xs font-bold text-stone-600">+{getDayParticipants(day).length - 5}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Events Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-stone-forest/40 backdrop-blur-sm"></div>
              
              <div className="space-y-8">
                {day.events.map((event, eventIndex) => (
                  <div 
                    key={event.id} 
                    id={`event-${event.id}`} 
                    className="relative"
                    draggable={editingEvent !== event.id}
                    onDragStart={(e) => handleDragStart(e, day.id, event.id)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day.id, event.id)}
                  >
                    {/* Timeline Node */}
                    <div className="absolute left-4 top-2 w-4 h-4 bg-stone-forest rounded-full border-4 border-white shadow-md z-10"></div>
                    
                    {/* Event Content */}
                    <div className="ml-16">
                      <div className={`bg-stone-200/20 backdrop-blur-sm rounded-2xl p-6 border border-stone-300/25 shadow-lg mb-4 transition-all ${
                        draggedEvent?.eventId === event.id ? 'opacity-50 transform scale-95' : 'opacity-100'
                      } ${editingEvent !== event.id ? 'cursor-grab active:cursor-grabbing hover:shadow-xl' : ''}`}>
                        <div className="group relative">
                          {editingEvent === event.id ? (
                            <>
                              <div className="flex items-start mb-1">
                                <div className="emoji-picker-container relative">
                                  <button
                                    ref={(el) => emojiButtonRefs.current[`edit-${event.id}`] = el}
                                    onClick={() => openEmojiPicker(`edit-${event.id}`)}
                                    className="w-8 h-8 text-lg bg-transparent border border-stone-300/30 rounded-md mr-2 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center hover:border-stone-400/50"
                                    title="Click to change emoji"
                                  >
                                    {editEmoji || '🎉'}
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      // Focus the textarea when Enter is pressed in title
                                      const textarea = e.currentTarget.parentElement?.parentElement?.querySelector('textarea');
                                      if (textarea) {
                                        textarea.focus();
                                      }
                                    } else if (e.key === 'Escape') {
                                      cancelEventEdit();
                                    }
                                  }}
                                  className="text-lg font-display font-medium text-stone-900 bg-transparent border-none outline-none focus:outline-none flex-1 resize-none hover:bg-white/10 focus:bg-white/10 rounded px-1 py-0.5 -mx-1 -my-0.5"
                                  placeholder="Event name..."
                                  autoFocus
                                />
                              </div>
                              <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    cancelEventEdit();
                                  }
                                }}
                                className="text-sm text-stone-700 leading-relaxed bg-transparent border-none outline-none w-full resize-none cursor-text hover:bg-white/10 focus:bg-white/10 rounded px-1 py-0.5 -mx-1 -my-0.5"
                                placeholder="Click to edit description..."
                                rows={3}
                                style={{
                                  minHeight: '60px',
                                  lineHeight: '1.5'
                                }}
                              />
                              
                              {/* Edit Mode - Location */}
                              <div className="mb-3 flex items-center location-autocomplete relative">
                                <svg className="w-3 h-3 mr-1 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    value={editLocation}
                                    onChange={(e) => {
                                      setEditLocation(e.target.value);
                                      if (e.target.value.length >= 2) {
                                        // Get the input field coordinates directly
                                        const inputRect = e.target.getBoundingClientRect();
                                        console.log('Input rect:', inputRect);
                                        console.log('Window scroll:', window.scrollY, window.scrollX);
                                        
                                        const position = {
                                          top: inputRect.bottom + 4,
                                          left: inputRect.left,
                                          width: inputRect.width
                                        };
                                        console.log('Setting position:', position);
                                        setLocationDropdownPosition(position);
                                        setShowLocationSuggestions(true);
                                      } else {
                                        setShowLocationSuggestions(false);
                                        setLocationDropdownPosition(null);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        if (showLocationSuggestions) {
                                          setShowLocationSuggestions(false);
                                        } else {
                                          cancelEventEdit();
                                        }
                                      }
                                    }}
                                    onFocus={(e) => {
                                      if (editLocation && editLocation.length >= 2) {
                                        // Get the input field coordinates directly
                                        const inputRect = e.target.getBoundingClientRect();
                                        setLocationDropdownPosition({
                                          top: inputRect.bottom + 4,
                                          left: inputRect.left,
                                          width: inputRect.width
                                        });
                                        setShowLocationSuggestions(true);
                                      }
                                    }}
                                    className="text-xs text-stone-600 font-medium bg-transparent border-none outline-none w-full hover:bg-white/10 focus:bg-white/10 rounded px-1 py-0.5 -mx-1 -my-0.5"
                                    placeholder="Add location..."
                                    ref={(el) => setLocationInputRef(el)}
                                  />
                                </div>
                              </div>
                              
                              {/* Edit Mode - Event Participants */}
                              <div className="flex items-center justify-between mb-2 mt-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-stone-600 font-medium">With:</span>
                                  <div className="flex items-center space-x-1">
                                    {event.participants.map((participant) => (
                                      <div key={participant.id} className="relative inline-block" style={{ position: 'relative' }}>
                                        <img
                                          src={participant.avatar}
                                          alt={participant.name}
                                          className="w-7 h-7 rounded-full border border-stone-300/50"
                                          title={participant.name}
                                        />
                                        <button
                                          onClick={() => removeParticipantFromEvent(day.id, event.id, participant.id)}
                                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                                          title="Remove participant"
                                          style={{ top: '-8px', right: '-8px' }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                    {allParticipants.filter(p => !event.participants.some(ep => ep.id === p.id)).length > 0 && (
                                      <button
                                        ref={(el) => addParticipantButtonRefs.current[`edit-${event.id}`] = el}
                                        onClick={() => openAddParticipantDropdown(`edit-${event.id}`)}
                                        className="w-7 h-7 bg-stone-200/80 hover:bg-stone-300/80 border border-stone-300/60 rounded-full flex items-center justify-center text-stone-600 hover:text-stone-700 transition-colors text-xs font-bold ml-1"
                                        title="Add participant"
                                        data-participant-dropdown
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="absolute top-0 right-0 flex items-center space-x-1">
                                {event.photos.length + event.videos.length === 0 && (
                                  <button
                                    onClick={() => deleteEvent(day.id, event.id)}
                                    className="p-1 rounded-lg hover:bg-red-200/50 transition-colors"
                                    title="Delete event"
                                  >
                                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => saveEventEdit(day.id, event.id)}
                                  disabled={savingEvent === event.id}
                                  className="p-1 rounded-lg hover:bg-stone-200/50 transition-colors disabled:opacity-50"
                                  title={savingEvent === event.id ? "Saving..." : "Save changes"}
                                >
                                  {savingEvent === event.id ? (
                                    <div className="w-4 h-4 animate-spin">
                                      <svg className="w-full h-full text-stone-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    </div>
                                  ) : (
                                    <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <h4 className="text-lg font-display font-medium text-stone-900 mb-1 relative">
                                <div className="emoji-picker-container relative inline-block">
                                  <button
                                    ref={(el) => emojiButtonRefs.current[event.id] = el}
                                    onClick={() => openEmojiPicker(event.id)}
                                    className="mr-2 hover:scale-110 transition-transform cursor-pointer"
                                    title="Click to change emoji"
                                  >
                                    {event.emoji}
                                  </button>
                                </div>
                                {event.name}
                              </h4>
                              <p className="text-sm text-stone-700 leading-relaxed mb-2">{event.description}</p>
                              {event.location && (
                                <p className="text-xs text-stone-600 font-medium mb-3 flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {event.location}
                                </p>
                              )}
                              
                              {/* Event Participants - View Only */}
                              {event.participants.length > 0 && (
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-stone-600 font-medium">With:</span>
                                    <div className="flex items-center space-x-1">
                                      {event.participants.map((participant) => (
                                        <img
                                          key={participant.id}
                                          src={participant.avatar}
                                          alt={participant.name}
                                          className="w-7 h-7 rounded-full border border-stone-300/50"
                                          title={participant.name}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="absolute top-0 right-0 flex items-center space-x-1">
                                {event.photos.length + event.videos.length === 0 && (
                                  <button
                                    onClick={() => deleteEvent(day.id, event.id)}
                                    className="p-1 rounded-lg hover:bg-red-200/50 transition-colors"
                                    title="Delete event"
                                  >
                                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => startEditingEvent(event.id, event.name, event.description, event.emoji, event.location)}
                                  className="p-1 rounded-lg hover:bg-stone-200/50 transition-colors"
                                  title="Edit event"
                                >
                                  <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Event photos grid */}
                      <div className="columns-1 sm:columns-2 gap-3 space-y-3 mb-4 relative" style={{columnFill: 'balance', zIndex: 0}}>
                        {event.photos.map((photo, index) => (
                          <div key={index} className="break-inside-avoid mb-3 rounded-2xl overflow-hidden group shadow-sm relative">
                            <img
                              src={typeof photo === 'string' ? photo : photo.url}
                              alt={`${event.name} photo ${index + 1}`}
                              className="w-full h-auto object-contain hover:scale-105 transition-transform cursor-pointer block bg-white/40 backdrop-blur-sm border border-stone-forest/30 rounded-2xl"
                              loading="lazy"
                              decoding="async"
                              onClick={() => {
                                const url = typeof photo === 'string' ? photo : photo.url;
                                setSelectedImage(url);
                                setSelectedMedia(typeof photo === 'object' ? {
                                  url,
                                  uploader: photo.uploader,
                                  eventId: event.id,
                                  dayId: day.id
                                } : {url});
                              }}
                            />
                            {typeof photo === 'object' && photo.uploader && (
                              <>
                                <div className="absolute top-2 left-2 w-6 h-6 rounded-full overflow-hidden border-2 border-white/80 shadow-sm">
                                  <img
                                    src={photo.uploader.avatar}
                                    alt={photo.uploader.name}
                                    className="w-full h-full object-cover"
                                    title={`Uploaded by ${photo.uploader.name}`}
                                  />
                                </div>
                                {editingEvent === event.id && api.getCredentials().userId === photo.uploader.id && (
                                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full overflow-hidden border-2 border-white/80 shadow-sm bg-white/20 backdrop-blur-sm">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMedia(day.id, event.id, typeof photo === 'string' ? photo : photo.url);
                                      }}
                                      className="w-full h-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                                      title="Delete photo"
                                    >
                                      <span className="text-xs font-bold">×</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        
                        {event.videos.map((video, index) => {
                          const videoUrl = typeof video === 'string' ? video : video.url;
                          return (
                          <div key={videoUrl || `video-${event.id}-${index}`} className="break-inside-avoid mb-3 bg-white/40 backdrop-blur-sm rounded-2xl overflow-hidden group shadow-sm border border-stone-forest/30">
                            <div className="relative">
                              <VideoContainer
                                key={videoUrl}
                                src={videoUrl}
                                className="w-full h-auto"
                                controls
                                preload="metadata"
                                playsInline
                                muted
                              />
                              {typeof video === 'object' && video.uploader && (
                                <>
                                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full overflow-hidden border-2 border-white/80 shadow-sm">
                                    <img
                                      src={video.uploader.avatar}
                                      alt={video.uploader.name}
                                      className="w-full h-full object-cover"
                                      title={`Uploaded by ${video.uploader.name}`}
                                    />
                                  </div>
                                  {editingEvent === event.id && api.getCredentials().userId === video.uploader.id && (
                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full overflow-hidden border-2 border-white/80 shadow-sm bg-white/20 backdrop-blur-sm">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteMedia(day.id, event.id, typeof video === 'string' ? video : video.url);
                                        }}
                                        className="w-full h-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                                        title="Delete video"
                                      >
                                        <span className="text-xs font-bold">×</span>
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          );
                        })}
                        
                        {/* Add to this event - discrete */}
                        <div className="break-inside-avoid mb-3 relative z-0">
                          <label className="cursor-pointer block">
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={async (e) => {
                                if (e.target.files) {
                                  await addPhotosToEvent(day.id, event.id, e.target.files);
                                  // Reset the input so the same file can be selected again
                                  e.target.value = '';
                                }
                              }}
                            />
                            <div className="h-8 bg-stone-200/30 backdrop-blur-sm rounded-lg border border-dashed border-stone-300/50 flex items-center justify-center hover:bg-stone-200/40 hover:border-stone-300/70 transition-all group relative z-0">
                              <div className="flex items-center space-x-1">
                                <div className="text-sm text-stone-600 group-hover:text-stone-700">+</div>
                                <div className="text-xs text-stone-500 group-hover:text-stone-600">Add</div>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-xs text-stone-700 bg-white/40 backdrop-blur-sm rounded-lg px-3 py-1 w-fit relative z-0">
                        <span>{event.photos.length + event.videos.length} items</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Drop Zone and Add New Event Button */}
                <div 
                  className="relative ml-16"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.id)}
                >
                  <div className="absolute left-4 top-2 w-4 h-4 bg-stone-400/60 rounded-full border-4 border-white shadow-md z-10"></div>
                  
                  {/* Drop zone indicator */}
                  {draggedEvent && (
                    <div className="mb-4 h-12 bg-stone-300/30 border-2 border-dashed border-stone-400/60 rounded-2xl flex items-center justify-center">
                      <span className="text-xs text-stone-500">Drop here to move event to end</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => addNewEvent(day.id)}
                    className="w-full bg-stone-100/50 backdrop-blur-sm rounded-2xl p-4 border-2 border-dashed border-stone-300/50 hover:border-stone-400/60 hover:bg-stone-100/70 transition-all group"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5 text-stone-500 group-hover:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-medium text-stone-600 group-hover:text-stone-700">Add New Event</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add New Day Button */}
        <div className="px-4 py-6">
          <button
            onClick={addNewDay}
            className="w-full bg-stone-100/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed border-stone-300/50 hover:border-stone-400/60 hover:bg-stone-100/70 transition-all group"
          >
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-6 h-6 text-stone-500 group-hover:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-lg font-medium text-stone-600 group-hover:text-stone-700">Add New Day</span>
            </div>
          </button>
        </div>
        </div>
        </div>
      </div>
      </div>
      </div>
      
      {/* Portal for emoji picker */}
      {showEmojiPicker && emojiPickerPosition && typeof document !== 'undefined' && createPortal(
        <div 
          data-emoji-picker
          className="fixed"
          style={{
            top: emojiPickerPosition.top,
            left: emojiPickerPosition.left,
            zIndex: 9999
          }}
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              if (showEmojiPicker.startsWith('edit-')) {
                handleEmojiSelect(emoji);
              } else {
                handleEmojiSelectDirect(emoji, showEmojiPicker);
              }
            }}
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>,
        document.body
      )}
      
      {/* Portal for participant dropdown */}
      {showAddParticipant && addParticipantPosition && typeof document !== 'undefined' && createPortal(
        <div 
          data-participant-dropdown
          className="fixed"
          style={{
            top: addParticipantPosition.top,
            left: addParticipantPosition.left,
            zIndex: 9999
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm border border-stone-300/50 rounded-lg shadow-lg py-1 min-w-[120px]">
            {allParticipants.filter(p => {
              const eventId = showAddParticipant.replace('edit-', '').replace('view-', '');
              const currentEvent = tripDays.flatMap(day => day.events).find(event => event.id === eventId);
              return !currentEvent?.participants.some(ep => ep.id === p.id);
            }).map((participant) => (
              <button
                key={participant.id}
                onClick={() => {
                  const eventId = showAddParticipant.replace('edit-', '').replace('view-', '');
                  const dayId = tripDays.find(day => day.events.some(e => e.id === eventId))?.id;
                  if (dayId) {
                    addParticipantToEvent(dayId, eventId, participant.id);
                    setShowAddParticipant("");
                    setAddParticipantPosition(null);
                  }
                }}
                className="w-full px-3 py-2 text-left hover:bg-stone-100/80 text-xs text-stone-700 flex items-center space-x-2"
              >
                <img
                  src={participant.avatar}
                  alt={participant.name}
                  className="w-4 h-4 rounded-full"
                />
                <span>{participant.name}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
      
      {/* Portal for date picker */}
      {showDatePicker && datePickerPosition && typeof document !== 'undefined' && createPortal(
        <div 
          data-date-picker
          className="fixed"
          style={{
            top: datePickerPosition.top,
            left: datePickerPosition.left,
            zIndex: 9999
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm border border-stone-300/50 rounded-lg shadow-lg p-4 min-w-[280px]">
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Calendar Header with Navigation */}
              <div className="col-span-7 flex items-center justify-between mb-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-stone-200/60 rounded transition-colors"
                  title="Previous month"
                >
                  <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center font-medium text-stone-700">
                  {new Date(datePickerMonth.year, datePickerMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-stone-200/60 rounded transition-colors"
                  title="Next month"
                >
                  <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* Day Labels */}
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-center text-stone-500 font-medium py-1">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {(() => {
                const now = new Date();
                const year = datePickerMonth.year;
                const month = datePickerMonth.month;
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - firstDay.getDay());
                
                const days = [];
                for (let i = 0; i < 42; i++) {
                  const currentDate = new Date(startDate);
                  currentDate.setDate(startDate.getDate() + i);
                  const isCurrentMonth = currentDate.getMonth() === month;
                  const isToday = currentDate.toDateString() === now.toDateString();
                  
                  days.push(
                    <button
                      key={i}
                      onClick={() => {
                        const dateStr = currentDate.toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        });
                        handleDateSelect(dateStr, showDatePicker);
                      }}
                      className={`
                        p-1 text-center rounded hover:bg-stone-200/60 transition-colors
                        ${isCurrentMonth ? 'text-stone-800' : 'text-stone-400'}
                        ${isToday ? 'bg-stone-forest/20 font-medium' : ''}
                      `}
                    >
                      {currentDate.getDate()}
                    </button>
                  );
                }
                return days;
              })()}
            </div>
            
            {/* Quick Options */}
            <div className="mt-3 pt-3 border-t border-stone-200/50 flex flex-wrap gap-2">
              {[
                'Today',
                'Yesterday',
                'Tomorrow'
              ].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    let date = new Date();
                    if (option === 'Yesterday') date.setDate(date.getDate() - 1);
                    if (option === 'Tomorrow') date.setDate(date.getDate() + 1);
                    
                    const dateStr = date.toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    });
                    handleDateSelect(dateStr, showDatePicker);
                  }}
                  className="px-2 py-1 text-xs bg-stone-100/80 hover:bg-stone-200/80 rounded text-stone-700 transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Portal for location suggestions */}
      {showLocationSuggestions && locationDropdownPosition && locationSuggestions.length > 0 && typeof document !== 'undefined' && createPortal(
        <div 
          data-location-dropdown
          className="fixed"
          style={{
            top: locationDropdownPosition.top,
            left: locationDropdownPosition.left,
            width: locationDropdownPosition.width,
            zIndex: 9999
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm border border-stone-300/50 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
            {locationSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(suggestion)}
                className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-100/70 transition-colors"
              >
                <div className="font-medium">
                  {suggestion.properties.name || suggestion.properties.formatted}
                </div>
                {suggestion.properties.country && (
                  <div className="text-stone-500 text-xs mt-0.5">
                    {suggestion.properties.country}
                    {suggestion.properties.state && `, ${suggestion.properties.state}`}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Image Modal */}
      {selectedImage && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-7xl max-h-[90vh] bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setSelectedImage(null);
                setSelectedMedia(null);
              }}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            >
              ×
            </button>
            {selectedMedia?.type === 'video' ? (
              <VideoContainer
                src={selectedImage}
                className="max-w-full max-h-[90vh] object-contain"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={selectedImage}
                alt="Enlarged view"
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
