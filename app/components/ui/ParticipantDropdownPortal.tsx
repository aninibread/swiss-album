import React from 'react';
import { createPortal } from 'react-dom';
import type { Participant } from '../../types';

interface ParticipantDropdownPortalProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  availableParticipants: Participant[];
  onParticipantSelect: (participantId: string) => void;
  onClose: () => void;
}

export function ParticipantDropdownPortal({
  isOpen,
  position,
  availableParticipants,
  onParticipantSelect,
  onClose
}: ParticipantDropdownPortalProps) {
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.add-participant-dropdown') && !target.closest('[data-participant-dropdown]')) {
        onClose();
      }
    };

    const handleScroll = () => {
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
      data-participant-dropdown
      className="fixed"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      <div className="bg-white/95 backdrop-blur-sm border border-stone-300/50 rounded-lg shadow-lg py-1 min-w-[120px] add-participant-dropdown">
        {availableParticipants.map((participant) => (
          <button
            key={participant.id}
            onClick={() => {
              onParticipantSelect(participant.id);
              onClose();
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
  );
}