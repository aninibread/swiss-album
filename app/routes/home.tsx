import type { Route } from "./+types/home";
import { useState, useEffect, useRef, useMemo } from "react";
import { api } from '../services/api';
import type { Participant, TripDay, TripEvent } from '../types';
import { LoginForm, AppLayout, SideNavigation, MainContent, AlbumHeader, TripHighlights, JourneyMap, ParticipantsList, DaySection, EventCard, EmojiPickerPortal, ParticipantDropdownPortal, DatePickerPortal, MediaModal } from '../components';
import { useAuth, useScrollTracking, useAlbumData, useEventEdit, useDayEdit, useMediaUpload, useEventReorder } from '../hooks';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Swiss Adventure Album 🇨🇭" },
    { name: "description", content: "Our amazing group trip to Switzerland!" },
  ];
}


export default function Home() {
  // Authentication
  const { isAuthenticated, login, logout, isLoading: authLoading, error: authError } = useAuth();
  
  // Album data management
  const { 
    tripDays, 
    albumData, 
    allParticipants, 
    isLoading, 
    error, 
    loadAlbumData, 
    clearAlbumData,
    setTripDays
  } = useAlbumData();

  // Additional error state for hooks (will be combined with album error)
  const [hookError, setHookError] = useState("");

  // Event editing
  const eventEditHook = useEventEdit({ 
    tripDays, 
    setTripDays, 
    allParticipants, 
    setError: setHookError 
  });

  // Day editing  
  const dayEditHook = useDayEdit({ 
    tripDays, 
    setTripDays, 
    allParticipants, 
    setError: setHookError 
  });

  // UI state - scroll tracking
  const { activeDay, activeEvent } = useScrollTracking({ 
    tripDays, 
    enabled: isAuthenticated 
  });
  // State now handled by hooks - destructure what we need
  const { 
    editingEvent, savingEvent, editTitle, editDescription, editLocation, 
    editEmoji, startEditingEvent, saveEventEdit, 
    cancelEventEdit, addNewEvent, deleteEvent, setEditTitle, setEditDescription, 
    setEditEmoji, setEditLocation 
  } = eventEditHook;
  
  const {
    editingDay, editDayTitle, editDayDate, startEditingDay, saveDayEdit, 
    cancelDayEdit, addNewDay, deleteDay, setEditDayTitle, setEditDayDate
  } = dayEditHook;
  
  // Event reordering functionality
  const { draggedEvent, moveEventUp, moveEventDown, canMoveEventUp, canMoveEventDown } = useEventReorder({ tripDays, setTripDays });
  
  // Global edit mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  
  // UI state that's not handled by data hooks
  const [showEmojiPicker, setShowEmojiPicker] = useState<string>("");
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{top: number, left: number} | null>(null);
  const emojiButtonRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});
  const [showAddParticipant, setShowAddParticipant] = useState<string>("");
  // Media modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{url: string; uploader?: {id: string; name: string; avatar: string}; eventId?: string; dayId?: string; type?: 'photo' | 'video'} | null>(null);
  
  // Media upload hook
  const { addPhotosToEvent, handleDeleteMedia } = useMediaUpload({
    tripDays,
    setTripDays,
    setError: setHookError,
    selectedMedia: selectedMedia ? { 
      dayId: selectedMedia.dayId || '', 
      eventId: selectedMedia.eventId || '', 
      url: selectedMedia.url 
    } : null,
    selectedImage,
    setSelectedImage,
    setSelectedMedia
  });
  const [addParticipantPosition, setAddParticipantPosition] = useState<{top: number, left: number} | null>(null);
  const addParticipantButtonRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});
  const [showDatePicker, setShowDatePicker] = useState<string>("");
  const [datePickerPosition, setDatePickerPosition] = useState<{top: number, left: number} | null>(null);
  const datePickerButtonRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});

  // Get random highlights from all event media - memoized to prevent reshuffling on every render
  const randomHighlights = useMemo(() => {
    const allMedia: Array<{
      url: string; 
      uploader?: { id: string; name: string; avatar: string }; 
      eventName: string; 
      dayTitle: string; 
      type: 'photo' | 'video'
    }> = [];
    
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
    
    // Use a seeded random to prevent reshuffling on every render
    // Take first 4 items (will be consistent until tripDays changes)
    return allMedia.slice(0, 4);
  }, [tripDays]); // Only recalculate when tripDays changes

  // Available participants for dropdown - memoized to prevent recalculation
  const availableParticipants = useMemo(() => {
    if (!showAddParticipant) return [];
    const eventId = showAddParticipant.replace('edit-', '').replace('view-', '');
    const currentEvent = tripDays.flatMap(day => day.events).find(event => event.id === eventId);
    return allParticipants.filter(p => 
      !currentEvent?.participants.some(ep => ep.id === p.id)
    );
  }, [allParticipants, tripDays, showAddParticipant]);

  // Load album data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAlbumData();
    }
  }, [isAuthenticated]);

  // Authentication handlers
  const handleLogin = async (userId: string, password: string) => {
    const success = await login(userId, password);
    if (success) {
      await loadAlbumData();
    }
    return success;
  };

  const handleLogout = () => {
    logout();
    clearAlbumData();
    setHookError("");
  };

  // Edit mode toggle
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    // Exit any current editing when toggling edit mode
    if (isEditMode) {
      cancelEventEdit();
      cancelDayEdit();
      closeEmojiPicker();
      closeParticipantDropdown();
      closeDatePicker();
    }
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} isLoading={authLoading} error={authError} />;
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
  const displayError = error || hookError;
  if (displayError && !albumData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-700 mb-4">{displayError}</p>
            <button 
              onClick={() => {
                loadAlbumData();
                setHookError("");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Utility functions
  const getDayParticipants = (day: TripDay): Participant[] => {
    const uniqueParticipants = new Map<string, Participant>();
    
    day.events.forEach((event: TripEvent) => {
      event.participants.forEach((participant: Participant) => {
        uniqueParticipants.set(participant.id, participant);
      });
    });
    
    return Array.from(uniqueParticipants.values());
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

  // Emoji picker handlers
  const handleEmojiSelect = (emoji: { emoji?: string; native?: string }) => {
    const emojiChar = emoji.emoji || emoji.native || '🎉';
    if (showEmojiPicker.startsWith('edit-')) {
      setEditEmoji(emojiChar);
    } else {
      const eventId = showEmojiPicker;
      setTripDays(prev => prev.map(day => ({
        ...day,
        events: day.events.map(event => 
          event.id === eventId 
            ? { ...event, emoji: emojiChar }
            : event
        )
      })));
    }
    setShowEmojiPicker("");
    setEmojiPickerPosition(null);
  };

  const openEmojiPicker = (eventId: string) => {
    if (!isEditMode) return; // Only allow in edit mode
    
    if (showEmojiPicker === eventId) {
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
  
  const closeEmojiPicker = () => {
    setShowEmojiPicker("");
    setEmojiPickerPosition(null);
  };

  // Participant dropdown handlers
  const openAddParticipantDropdown = (eventId: string) => {
    if (!isEditMode) return; // Only allow in edit mode
    
    if (showAddParticipant === eventId) {
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
  
  const closeParticipantDropdown = () => {
    setShowAddParticipant("");
    setAddParticipantPosition(null);
  };
  
  const handleParticipantSelect = (participantId: string) => {
    const eventId = showAddParticipant.replace('edit-', '').replace('view-', '');
    const dayId = tripDays.find(day => day.events.some(e => e.id === eventId))?.id;
    if (dayId) {
      addParticipantToEvent(dayId, eventId, participantId);
    }
  };

  // Date picker handlers
  const openDatePicker = (dayId: string) => {
    if (!isEditMode) return; // Only allow in edit mode
    
    if (showDatePicker === dayId) {
      setShowDatePicker("");
      setDatePickerPosition(null);
      return;
    }
    
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
  
  const closeDatePicker = () => {
    setShowDatePicker("");
    setDatePickerPosition(null);
  };

  const handleDateSelect = (date: string) => {
    setEditDayDate(date);
    closeDatePicker();
  };

  // Participant management API calls
  const addParticipantToEvent = async (dayId: string, eventId: string, participantId: string) => {
    try {
      await api.updateEventParticipants(eventId, participantId, 'add');
      
      setTripDays(prev => prev.map(day => 
        day.id === dayId 
          ? {
              ...day,
              events: day.events.map(event => 
                event.id === eventId 
                  ? {
                      ...event,
                      participants: event.participants.some(p => p.id === participantId)
                        ? event.participants
                        : [...event.participants, allParticipants.find(p => p.id === participantId)].filter((p): p is Participant => p !== undefined)
                    }
                  : event
              )
            }
          : day
      ));
    } catch (error) {
      console.error('Failed to add participant:', error);
      setHookError('Failed to add participant');
    }
  };

  const removeParticipantFromEvent = async (dayId: string, eventId: string, participantId: string) => {
    try {
      await api.updateEventParticipants(eventId, participantId, 'remove');
      
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
      setHookError('Failed to remove participant');
    }
  };

  return (
    <>
      <AppLayout>
        <SideNavigation
          tripDays={tripDays}
          activeDay={activeDay}
          activeEvent={activeEvent}
          onScrollToDay={scrollToDay}
          onScrollToEvent={scrollToEvent}
        />
        <MainContent>
        {/* Album Header */}
        <AlbumHeader
          title="Swiss Adventure"
          subtitle="July 2024 · 136 photos"
          isEditMode={isEditMode}
          onEditModeToggle={toggleEditMode}
          onLogout={handleLogout}
        >
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="flex-1 lg:flex-[2]">
              <TripHighlights
                highlights={randomHighlights}
                onImageClick={setSelectedImage}
              />
            </div>
            
            <div className="w-full lg:w-64 space-y-6">
              <JourneyMap />
              <ParticipantsList participants={allParticipants} />
            </div>
          </div>
        </AlbumHeader>

        {/* All Photos View */}
        <div className="px-4 py-6">
          {tripDays.map((day) => (
            <DaySection
              key={day.id}
              day={day}
              isEditMode={isEditMode}
              editingDay={editingDay}
              editDayTitle={editDayTitle}
              editDayDate={editDayDate}
              onEditDayTitle={setEditDayTitle}
              onEditDayDate={setEditDayDate}
              onSaveEdit={saveDayEdit}
              onCancelEdit={cancelDayEdit}
              onStartEdit={startEditingDay}
              onDeleteDay={deleteDay}
              onOpenDatePicker={openDatePicker}
              getDayParticipants={getDayParticipants}
              datePickerButtonRefs={datePickerButtonRefs}
            >
              <>
                {day.events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    dayId={day.id}
                    isEditMode={isEditMode}
                    isEditing={editingEvent === event.id}
                    isDragging={draggedEvent?.eventId === event.id}
                    currentUserId={api.getCredentials().userId || undefined}
                    editTitle={editTitle}
                    editDescription={editDescription}
                    editEmoji={editEmoji}
                    editLocation={editLocation}
                    savingEvent={savingEvent}
                    allParticipants={allParticipants}
                    onMoveEventUp={moveEventUp}
                    onMoveEventDown={moveEventDown}
                    canMoveUp={canMoveEventUp(day.id, event.id)}
                    canMoveDown={canMoveEventDown(day.id, event.id)}
                    onStartEdit={startEditingEvent}
                    onSaveEdit={saveEventEdit}
                    onCancelEdit={cancelEventEdit}
                    onDeleteEvent={deleteEvent}
                    onSetEditTitle={setEditTitle}
                    onSetEditDescription={setEditDescription}
                    onSetEditEmoji={setEditEmoji}
                    onSetEditLocation={setEditLocation}
                    onOpenEmojiPicker={openEmojiPicker}
                    onImageClick={setSelectedImage}
                    onSetSelectedMedia={setSelectedMedia}
                    onDeleteMedia={handleDeleteMedia}
                    onAddPhotos={addPhotosToEvent}
                    onAddParticipant={addParticipantToEvent}
                    onRemoveParticipant={removeParticipantFromEvent}
                    onOpenAddParticipant={openAddParticipantDropdown}
                    emojiButtonRefs={emojiButtonRefs}
                    addParticipantButtonRefs={addParticipantButtonRefs}
                  />
                ))}
                
                {/* Add New Event Button - only show in edit mode */}
                {isEditMode && (
                  <div className="relative ml-8 sm:ml-16">
                    <div className="absolute left-2 sm:left-4 top-2 w-3 h-3 sm:w-4 sm:h-4 bg-stone-forest rounded-full border-2 sm:border-4 border-white shadow-md z-10 -ml-8 sm:-ml-16"></div>
                    <button
                      onClick={() => addNewEvent(day.id)}
                      className="w-full bg-stone-100/50 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border-2 border-dashed border-stone-300/50 hover:border-stone-400/60 hover:bg-stone-100/70 transition-all group touch-manipulation"
                    >
                      <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500 group-hover:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium text-stone-600 group-hover:text-stone-700">Add New Event</span>
                      </div>
                    </button>
                  </div>
                )}
              </>
            </DaySection>
          ))}
          
          {/* Add New Day Button - only show in edit mode */}
          {isEditMode && (
            <div className="px-4 py-6">
              <button
                onClick={addNewDay}
                className="w-full bg-stone-100/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-dashed border-stone-300/50 hover:border-stone-400/60 hover:bg-stone-100/70 transition-all group touch-manipulation"
              >
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-stone-500 group-hover:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-base sm:text-lg font-medium text-stone-600 group-hover:text-stone-700">Add New Day</span>
                </div>
              </button>
            </div>
          )}
        </div>
        </MainContent>
      </AppLayout>
      
      {/* Edit Mode Portals - only render when in edit mode */}
      {isEditMode && (
        <>
          {/* Emoji Picker Portal */}
          <EmojiPickerPortal
            isOpen={!!showEmojiPicker}
            position={emojiPickerPosition}
            onEmojiSelect={handleEmojiSelect}
            onClose={closeEmojiPicker}
          />
          
          {/* Participant Dropdown Portal */}
          <ParticipantDropdownPortal
            isOpen={!!showAddParticipant}
            position={addParticipantPosition}
            availableParticipants={availableParticipants}
            onParticipantSelect={handleParticipantSelect}
            onClose={closeParticipantDropdown}
          />
          
          {/* Date Picker Portal */}
          <DatePickerPortal
            isOpen={!!showDatePicker}
            position={datePickerPosition}
            onDateSelect={handleDateSelect}
            onClose={closeDatePicker}
          />
        </>
      )}
      
      

      {/* Media Modal */}
      <MediaModal
        isOpen={!!selectedImage}
        mediaUrl={selectedImage}
        mediaType={selectedMedia?.type}
        onClose={() => {
          setSelectedImage(null);
          setSelectedMedia(null);
        }}
      />
    </>
  );
}
