import React from 'react';
import { VideoContainer } from '../media/VideoContainer';

interface MediaHighlight {
  url: string;
  uploader?: {
    id: string;
    name: string;
    avatar: string;
  };
  eventName: string;
  dayTitle: string;
  type: 'photo' | 'video';
}

interface TripHighlightsProps {
  highlights: MediaHighlight[];
  onImageClick: (url: string) => void;
}

export function TripHighlights({ highlights, onImageClick }: TripHighlightsProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-display font-medium text-stone-900 mb-3">Trip Highlights</h3>
      <div className="columns-1 sm:columns-2 lg:columns-2 xl:columns-2 gap-3 space-y-3" style={{columnFill: 'balance'}}>
        {highlights.map((media, index) => (
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
                onClick={() => onImageClick(media.url)}
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
  );
}