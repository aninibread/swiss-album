import React from 'react';
import { MediaGallery } from './MediaGallery';
import type { TripEvent, Participant } from '../../types';

interface EventCardProps {
  event: TripEvent;
  dayId: string;
  isEditMode: boolean;
  isEditing: boolean;
  isDragging: boolean;
  currentUserId?: string;
  editTitle: string;
  editDescription: string;
  editEmoji: string;
  editLocation: string;
  savingEvent: string;
  allParticipants: Participant[];
  
  // Event handlers
  onMoveEventUp: (dayId: string, eventId: string) => void;
  onMoveEventDown: (dayId: string, eventId: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onStartEdit: (eventId: string, name: string, description: string, emoji: string, location?: string) => void;
  onSaveEdit: (dayId: string, eventId: string) => void;
  onCancelEdit: () => void;
  onDeleteEvent: (dayId: string, eventId: string) => void;
  onSetEditTitle: (value: string) => void;
  onSetEditDescription: (value: string) => void;
  onSetEditEmoji: (value: string) => void;
  onSetEditLocation: (value: string) => void;
  onOpenEmojiPicker: (id: string) => void;
  onImageClick: (url: string) => void;
  onSetSelectedMedia: (media: any) => void;
  onDeleteMedia: (dayId: string, eventId: string, url: string) => void;
  onAddPhotos: (dayId: string, eventId: string, files: FileList) => void;
  onAddParticipant: (dayId: string, eventId: string, participantId: string) => void;
  onRemoveParticipant: (dayId: string, eventId: string, participantId: string) => void;
  onOpenAddParticipant: (eventId: string) => void;
  
  // Refs and other props
  emojiButtonRefs: React.MutableRefObject<{[key: string]: HTMLButtonElement | null}>;
  addParticipantButtonRefs: React.MutableRefObject<{[key: string]: HTMLButtonElement | null}>;
}

export function EventCard({
  event,
  dayId,
  isEditMode,
  isEditing,
  isDragging,
  currentUserId,
  editTitle,
  editDescription,
  editEmoji,
  editLocation,
  savingEvent,
  allParticipants,
  onMoveEventUp,
  onMoveEventDown,
  canMoveUp,
  canMoveDown,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteEvent,
  onSetEditTitle,
  onSetEditDescription,
  onSetEditEmoji,
  onSetEditLocation,
  onOpenEmojiPicker,
  onImageClick,
  onSetSelectedMedia,
  onDeleteMedia,
  onAddPhotos,
  onAddParticipant,
  onRemoveParticipant,
  onOpenAddParticipant,
  emojiButtonRefs,
  addParticipantButtonRefs
}: EventCardProps) {
  const isSaving = savingEvent === event.id;

  return (
    <div 
      id={`event-${event.id}`} 
      className="relative"
    >
      {/* Timeline Node */}
      <div className="absolute left-2 sm:left-4 top-2 w-3 h-3 sm:w-4 sm:h-4 bg-stone-forest rounded-full border-2 sm:border-4 border-white shadow-md z-10"></div>
      
      {/* Event Content */}
      <div className="ml-8 sm:ml-16">
        <div className={`bg-stone-200/20 backdrop-blur-sm rounded-2xl p-3 sm:p-6 border border-stone-300/25 shadow-lg mb-4 transition-all relative ${
          isDragging ? 'opacity-50 transform scale-95' : 'opacity-100'
        }`}>
          {/* Reorder arrows - positioned next to the actual event card */}
          {isEditMode && (
            <div className="absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 flex flex-col space-y-1 z-20">
              <button
                onClick={() => onMoveEventUp(dayId, event.id)}
                disabled={!canMoveUp}
                className={`p-1.5 sm:p-1 rounded-lg transition-colors touch-manipulation ${
                  canMoveUp 
                    ? 'hover:bg-stone-200/50 text-stone-600 active:bg-stone-200/70 bg-white/80 shadow-sm' 
                    : 'text-stone-300 cursor-not-allowed bg-white/60'
                }`}
                title="Move event up"
              >
                <svg className="w-4 h-4 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => onMoveEventDown(dayId, event.id)}
                disabled={!canMoveDown}
                className={`p-1.5 sm:p-1 rounded-lg transition-colors touch-manipulation ${
                  canMoveDown 
                    ? 'hover:bg-stone-200/50 text-stone-600 active:bg-stone-200/70 bg-white/80 shadow-sm' 
                    : 'text-stone-300 cursor-not-allowed bg-white/60'
                }`}
                title="Move event down"
              >
                <svg className="w-4 h-4 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
          <div className="relative">
            {isEditing ? (
              <>
                {/* Edit Mode */}
                <div className="absolute top-0 right-0 flex items-center space-x-1 z-20">
                  <button
                    onClick={() => onSaveEdit(dayId, event.id)}
                    disabled={isSaving}
                    className="p-1.5 sm:p-1 rounded-lg hover:bg-stone-200/50 transition-colors touch-manipulation"
                    title="Save changes"
                  >
                    <svg className="w-5 h-5 sm:w-4 sm:h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  {(!event.photos || event.photos.length === 0) && (!event.videos || event.videos.length === 0) && (
                    <button
                      onClick={() => onDeleteEvent(dayId, event.id)}
                      className="p-1.5 sm:p-1 rounded-lg hover:bg-red-200/50 transition-colors touch-manipulation"
                      title="Delete event"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex items-start mb-1 pr-16 sm:pr-20">
                  <button
                    ref={(el) => { emojiButtonRefs.current[`edit-${event.id}`] = el; }}
                    onClick={() => onOpenEmojiPicker(`edit-${event.id}`)}
                    className="emoji-picker-container relative text-lg sm:text-lg mr-2 hover:scale-110 transition-transform cursor-pointer bg-transparent border border-stone-300/30 rounded-md w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center hover:border-stone-400/50 touch-manipulation"
                    title="Click to change emoji"
                  >
                    {editEmoji || '🎉'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => onSetEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const textarea = e.currentTarget.parentElement?.parentElement?.querySelector('textarea');
                        if (textarea) {
                          textarea.focus();
                        }
                      } else if (e.key === 'Escape') {
                        onCancelEdit();
                      }
                    }}
                    className="text-base sm:text-lg font-display font-medium text-stone-900 bg-transparent border-none outline-none focus:outline-none w-full resize-none hover:bg-white/10 focus:bg-white/10 rounded px-1 py-0.5 -mx-1 -my-0.5"
                    placeholder="Event name..."
                    autoFocus
                    />
                  </div>
                </div>
                
                <div className="pr-16 sm:pr-20">
                  <textarea
                      value={editDescription}
                      onChange={(e) => onSetEditDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          onCancelEdit();
                        }
                      }}
                      className="text-sm text-stone-700 leading-relaxed bg-transparent border-none outline-none w-full resize-none cursor-text hover:bg-white/10 focus:bg-white/10 rounded px-1 py-0.5 -mx-1 -my-0.5"
                      placeholder="Click to edit description..."
                      rows={2}
                      style={{
                        minHeight: '40px',
                        lineHeight: '1.5'
                      }}
                    />
                </div>
                
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
                      onChange={(e) => onSetEditLocation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          onCancelEdit();
                        }
                      }}
                      className="text-xs text-stone-600 font-medium bg-transparent border-none outline-none w-full hover:bg-white/10 focus:bg-white/10 rounded px-1 py-0.5 -mx-1 -my-0.5"
                      placeholder="Add location..."
                    />
                  </div>
                </div>

                {/* Edit Mode - Participants */}
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-xs text-stone-600 font-medium">With:</span>
                  <div className="flex items-center space-x-2">
                    {event.participants.map((participant) => (
                      <div key={participant.id} className="relative group">
                        <div className="w-7 h-7 rounded-full border-2 border-white/80 shadow-sm overflow-hidden bg-white/20 backdrop-blur-sm">
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="w-full h-full object-cover"
                            title={participant.name}
                          />
                        </div>
                        {isEditMode && (
                          <button
                            onClick={() => onRemoveParticipant(dayId, event.id, participant.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                            title="Remove participant"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {/* Only show add button if there are participants available to add and in edit mode */}
                    {isEditMode && allParticipants.some(p => !event.participants.some(ep => ep.id === p.id)) && (
                      <button
                        ref={(el) => { addParticipantButtonRefs.current[event.id] = el; }}
                        onClick={() => onOpenAddParticipant(event.id)}
                        className="w-6 h-6 bg-stone-300 hover:bg-stone-400 text-stone-600 hover:text-stone-700 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                        title="Add participant"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* View Mode */}
                {isEditMode && (
                  <div className="absolute top-0 right-0 flex items-center space-x-1">
                    <button
                      onClick={() => onStartEdit(event.id, event.name, event.description, event.emoji, event.location)}
                      className="p-1 rounded-lg hover:bg-stone-200/50 transition-colors touch-manipulation"
                      title="Edit event"
                    >
                      <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {(!event.photos || event.photos.length === 0) && (!event.videos || event.videos.length === 0) && (
                      <button
                        onClick={() => onDeleteEvent(dayId, event.id)}
                        className="p-1 rounded-lg hover:bg-red-200/50 transition-colors touch-manipulation"
                        title="Delete event"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-start mb-2">
                  <span className="text-lg mr-2 select-none">{event.emoji}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-display font-medium text-stone-900 mb-1">{event.name}</h3>
                  </div>
                </div>

                {/* Description aligned with emoji start */}
                <p className="text-sm text-stone-700 leading-relaxed mb-2">{event.description}</p>
                
                {/* Location aligned with emoji start */}
                {event.location && (
                  <div className="flex items-center mb-2">
                    <svg className="w-3 h-3 mr-1 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs text-stone-600 font-medium">{event.location}</span>
                  </div>
                )}

                {/* View Mode - Participants aligned with emoji start */}
                {event.participants.length > 0 && (
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xs text-stone-600 font-medium">With:</span>
                    <div className="flex items-center -space-x-2">
                      {event.participants.map((participant, index) => (
                        <div
                          key={participant.id}
                          className="w-7 h-7 rounded-full border-2 border-white/80 shadow-sm overflow-hidden bg-white/20 backdrop-blur-sm"
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
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Media Gallery */}
        <MediaGallery
          photos={event.photos}
          videos={event.videos}
          eventId={event.id}
          dayId={dayId}
          isEditMode={isEditMode}
          isEditing={isEditing}
          currentUserId={currentUserId}
          onImageClick={onImageClick}
          onSetSelectedMedia={onSetSelectedMedia}
          onDeleteMedia={onDeleteMedia}
          onAddPhotos={onAddPhotos}
        />
        
      </div>
    </div>
  );
}