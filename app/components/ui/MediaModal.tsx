import React from 'react';
import { createPortal } from 'react-dom';
import { VideoContainer } from '../media/VideoContainer';

interface MediaModalProps {
  isOpen: boolean;
  mediaUrl: string | null;
  mediaType?: 'photo' | 'video';
  onClose: () => void;
}

export function MediaModal({
  isOpen,
  mediaUrl,
  mediaType = 'photo',
  onClose
}: MediaModalProps) {
  // Close modal on escape key
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mediaUrl || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-7xl max-h-[90vh] bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
          title="Close (Esc)"
        >
          ×
        </button>
        {mediaType === 'video' ? (
          <VideoContainer
            src={mediaUrl}
            className="max-w-full max-h-[90vh] object-contain"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Enlarged view"
            className="max-w-full max-h-[90vh] object-contain"
          />
        )}
      </div>
    </div>,
    document.body
  );
}