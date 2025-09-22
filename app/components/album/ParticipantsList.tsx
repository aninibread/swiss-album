import React from 'react';
import type { Participant } from '../../types';

interface ParticipantsListProps {
  participants: Participant[];
  title?: string;
}

export function ParticipantsList({ participants, title = 'Participants' }: ParticipantsListProps) {
  return (
    <div>
      <h3 className="text-lg font-display font-medium text-stone-900 mb-3">{title}</h3>
      <div className="space-y-2 lg:space-y-2 mt-4 lg:block">
        {/* Mobile: Horizontal scroll */}
        <div className="flex lg:hidden space-x-3 overflow-x-auto pb-2">
          {participants.map((participant) => (
            <div key={participant.id} className="flex flex-col items-center space-y-1 flex-shrink-0">
              <img
                src={participant.avatar}
                alt={participant.name}
                className="w-8 h-8 rounded-full border border-stone-forest/30"
                title={participant.name}
              />
              <span className="text-xs text-stone-600 text-center max-w-[60px] truncate">{participant.name}</span>
            </div>
          ))}
        </div>
        
        {/* Desktop: Vertical list */}
        <div className="hidden lg:block space-y-2">
          {participants.map((participant) => (
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
  );
}