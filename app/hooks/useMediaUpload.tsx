import { useCallback } from 'react';
import { api } from '../services/api';
import type { TripDay, MediaItem } from '../types';

interface UseMediaUploadOptions {
  tripDays: TripDay[];
  setTripDays: React.Dispatch<React.SetStateAction<TripDay[]>>;
  setError: (error: string) => void;
  selectedMedia?: { dayId: string; eventId: string; url: string } | null;
  selectedImage?: string | null;
  setSelectedImage?: (url: string | null) => void;
  setSelectedMedia?: (media: any) => void;
}

export function useMediaUpload(options: UseMediaUploadOptions) {
  const { 
    tripDays, 
    setTripDays, 
    setError, 
    selectedMedia, 
    selectedImage, 
    setSelectedImage, 
    setSelectedMedia 
  } = options;

  const addPhotosToEvent = useCallback(async (dayId: string, eventId: string, files: FileList) => {
    try {
      // Show loading state with temporary URLs
      const fileArray = Array.from(files);
      const tempUrls: string[] = [];
      const tempPhotos: MediaItem[] = [];
      const tempVideos: MediaItem[] = [];
      
      fileArray.forEach(file => {
        const url = URL.createObjectURL(file);
        tempUrls.push(url);
        const mediaItem: MediaItem = {
          url,
          uploader: {
            id: 'temp',
            name: 'Uploading...',
            avatar: ''
          }
        };
        if (file.type.startsWith('video/')) {
          tempVideos.push(mediaItem);
        } else {
          tempPhotos.push(mediaItem);
        }
      });
      
      // Update UI immediately with temporary URLs
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
      const result = await api.uploadMedia(eventId, files) as any;
      
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
    }
  }, [setTripDays, setError]);

  const handleDeleteMedia = useCallback(async (dayId?: string, eventId?: string, mediaUrl?: string) => {
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
      if (selectedImage === targetUrl && setSelectedImage && setSelectedMedia) {
        setSelectedImage(null);
        setSelectedMedia(null);
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      setError('Failed to delete media: ' + (error as Error).message);
    }
  }, [selectedMedia, selectedImage, setSelectedImage, setSelectedMedia, setTripDays, setError]);

  return {
    addPhotosToEvent,
    handleDeleteMedia
  };
}