import React from 'react';
import { EmojiPicker } from 'frimousse';
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
      className="fixed rounded-lg shadow-xl border border-gray-200 overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      <EmojiPicker.Root 
        className="isolate flex h-[368px] w-fit flex-col bg-white"
        onEmojiSelect={(emoji) => {
          onEmojiSelect({ emoji: emoji.emoji, native: emoji.emoji });
          onClose();
        }}
        columns={8}
        locale="en"
        skinTone="none"
      >
        <EmojiPicker.Search className="z-10 mx-2 mt-2 appearance-none rounded-md bg-neutral-100 px-2.5 py-2 text-sm" />
        <EmojiPicker.Viewport className="relative flex-1 outline-hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
          <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm">
            Loading…
          </EmojiPicker.Loading>
          <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm">
            No emoji found.
          </EmojiPicker.Empty>
          <EmojiPicker.List
            className="select-none pb-1.5"
            components={{
              CategoryHeader: ({ category, ...props }) => (
                <div
                  className="bg-white px-3 pt-3 pb-1.5 font-medium text-neutral-600 text-xs"
                  {...props}
                >
                  {category.label}
                </div>
              ),
              Row: ({ children, ...props }) => (
                <div className="scroll-my-1.5 px-1.5" {...props}>
                  {children}
                </div>
              ),
              Emoji: ({ emoji, ...props }) => (
                <button
                  className="flex size-8 items-center justify-center rounded-md text-lg data-[active]:bg-neutral-100"
                  {...props}
                >
                  {emoji.emoji}
                </button>
              ),
            }}
          />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
    </div>,
    document.body
  );
}