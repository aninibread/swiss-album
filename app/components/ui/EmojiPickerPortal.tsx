import React from 'react';
import EmojiPicker from 'emoji-picker-react';
import { createPortal } from 'react-dom';

interface EmojiPickerPortalProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  onEmojiSelect: (emoji: any) => void;
  onClose: () => void;
}

export function EmojiPickerPortal({
  isOpen,
  position,
  onEmojiSelect,
  onClose
}: EmojiPickerPortalProps) {
  // Close emoji picker when clicking outside or scrolling
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.emoji-picker-container') && !target.closest('[data-emoji-picker]')) {
        onClose();
      }
    };

    const handleScroll = (event: Event) => {
      const target = event.target as Element;
      // Don't close if scrolling within the emoji picker
      if (target && typeof target.closest === 'function' && target.closest('[data-emoji-picker]')) {
        return;
      }
      onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !position || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div 
      data-emoji-picker
      className="fixed"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      <EmojiPicker
        onEmojiClick={onEmojiSelect}
        theme={"light" as any}
        previewConfig={{
          showPreview: false
        }}
        skinTonesDisabled
      />
    </div>,
    document.body
  );
}