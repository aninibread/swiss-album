import React, { useEffect } from 'react';
import { VideoContainer } from '../media/VideoContainer';
import { MediaComments } from './MediaComments';
import type { MediaItem } from '../../types';
import type { useCommentsManager } from '../../hooks';

interface MediaGalleryProps {
  photos: MediaItem[];
  videos: MediaItem[];
  eventId: string;
  dayId: string;
  isEditMode: boolean;
  isEditing: boolean;
  currentUserId?: string;
  onImageClick: (url: string) => void;
  onSetSelectedMedia: (media: any) => void;
  onDeleteMedia: (dayId: string, eventId: string, url: string) => void;
  onAddPhotos?: (dayId: string, eventId: string, files: FileList) => void;
  commentsManager: ReturnType<typeof useCommentsManager>;
}

/**
 * Utility function to check if user can delete media
 */
const canDeleteMedia = (media: MediaItem, currentUserId?: string): boolean => {
  return typeof media === 'object' && media.uploader?.id === currentUserId;
};

/**
 * Utility function to handle photo click events
 */
const createPhotoClickHandler = (
  photo: MediaItem,
  index: number,
  onImageClick: (url: string) => void,
  onSetSelectedMedia: (media: any) => void
) => () => {
  const photoUrl = typeof photo === 'string' ? photo : photo.url;
  onImageClick(photoUrl);
  onSetSelectedMedia({ photos: [photo], currentIndex: index });
};

/**
 * Utility function to handle delete click events
 */
const createDeleteClickHandler = (
  url: string,
  onDeleteMedia: (dayId: string, eventId: string, url: string) => void,
  dayId: string,
  eventId: string
) => (e: React.MouseEvent) => {
  e.stopPropagation();
  onDeleteMedia(dayId, eventId, url);
};

/**
 * MediaGallery component displays photos and videos in a masonry layout
 * with integrated comment functionality for each media item
 */
export function MediaGallery({
  photos,
  videos,
  eventId,
  dayId,
  isEditMode,
  currentUserId,
  onImageClick,
  onSetSelectedMedia,
  onDeleteMedia,
  onAddPhotos,
  commentsManager
}: MediaGalleryProps) {
  // Calculate total items for display
  const totalItems = photos.length + videos.length;

  // Load comments for all media items when component mounts or media changes
  useEffect(() => {
    const allMediaUrls = [
      ...photos.map(p => typeof p === 'string' ? p : p.url),
      ...videos.map(v => typeof v === 'string' ? v : v.url)
    ];
    
    allMediaUrls.forEach(mediaUrl => {
      if (!commentsManager.isLoaded(mediaUrl)) {
        commentsManager.loadComments(mediaUrl);
      }
    });
  }, [photos, videos, commentsManager]);

  return (
    <>
      <div className="columns-1 sm:columns-2 gap-3 space-y-3 relative" style={{columnFill: 'balance', zIndex: 0}}>
        {/* Photos */}
        {photos.map((photo, index) => {
          const photoUrl = typeof photo === 'string' ? photo : photo.url;
          
          return (
            <div key={index} className="break-inside-avoid mb-3 rounded-2xl overflow-hidden group shadow-sm relative">
              <div className="relative">
                <img
                  src={photoUrl}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-auto object-contain hover:scale-105 transition-transform cursor-pointer block bg-white/40 backdrop-blur-sm border border-stone-forest/30 rounded-2xl"
                  loading="lazy"
                  decoding="async"
                  onClick={createPhotoClickHandler(photo, index, onImageClick, onSetSelectedMedia)}
                />
                
                {/* Photo metadata overlay */}
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
                    {isEditMode && canDeleteMedia(photo, currentUserId) && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full overflow-hidden border-2 border-white/80 shadow-sm bg-white/20 backdrop-blur-sm">
                        <button
                          onClick={createDeleteClickHandler(photo.url, onDeleteMedia, dayId, eventId)}
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
              
              {/* Comments Section */}
              <div className="mt-3">
                <MediaComments
                  mediaUrl={photoUrl}
                  commentsManager={commentsManager}
                  currentUserId={currentUserId}
                />
              </div>
            </div>
          );
        })}

        {/* Videos */}
        {videos.map((video, index) => {
          const videoUrl = typeof video === 'string' ? video : video.url;
          
          return (
            <div key={videoUrl || `video-${eventId}-${index}`} className="break-inside-avoid mb-3 bg-white/40 backdrop-blur-sm rounded-2xl overflow-hidden group shadow-sm border border-stone-forest/30">
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
                
                {/* Video metadata overlay */}
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
                    {isEditMode && canDeleteMedia(video, currentUserId) && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full overflow-hidden border-2 border-white/80 shadow-sm bg-white/20 backdrop-blur-sm">
                        <button
                          onClick={createDeleteClickHandler(video.url, onDeleteMedia, dayId, eventId)}
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
            
              {/* Comments Section */}
              <div className="mt-3">
                <MediaComments
                  mediaUrl={videoUrl}
                  commentsManager={commentsManager}
                  currentUserId={currentUserId}
                />
              </div>
            </div>
          );
        })}
      
        {/* Add media button - only show in edit mode */}
        {isEditMode && onAddPhotos && (
          <div className="break-inside-avoid mb-3">
            <label className="block">
              <div className="bg-stone-100/20 backdrop-blur-sm border-2 border-dashed border-stone-300/30 hover:border-stone-400/50 rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-stone-100/30 group">
                <span className="text-stone-500 group-hover:text-stone-600 text-sm font-medium">+ Add</span>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files) {
                    await onAddPhotos(dayId, eventId, e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
        )}
      </div>
      
      {/* Item count pill - only show if there are items */}
      {totalItems > 0 && (
        <div className="mt-3">
          <span className="inline-block bg-stone-200/40 backdrop-blur-sm text-stone-600 text-xs font-medium px-2 py-1 rounded-full">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </>
  );
}