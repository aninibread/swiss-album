import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { TripDay, TripEvent, Participant } from '../types';

interface UseEventEditOptions {
  tripDays: TripDay[];
  setTripDays: React.Dispatch<React.SetStateAction<TripDay[]>>;
  allParticipants: Participant[];
  setError: (error: string) => void;
}

export function useEventEdit(options: UseEventEditOptions) {
  const { tripDays, setTripDays, allParticipants, setError } = options;
  
  const [editingEvent, setEditingEvent] = useState<string>("");
  const [savingEvent, setSavingEvent] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editEmoji, setEditEmoji] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");
  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);

  const startEditingEvent = useCallback((eventId: string, currentName: string, currentDescription: string, currentEmoji: string, currentLocation?: string) => {
    setEditingEvent(eventId);
    setEditTitle(currentName);
    setEditDescription(currentDescription);
    setEditEmoji(currentEmoji);
    setEditLocation(currentLocation || "");
  }, []);

  const saveEventEdit = useCallback(async (dayId: string, eventId: string) => {
    if (savingEvent === eventId) return; // Prevent double-saves
    
    setSavingEvent(eventId);
    
    // Store current values for potential rollback
    const currentEvent = tripDays.find(day => day.id === dayId)?.events.find(event => event.id === eventId);
    const updateData = {
      name: editTitle,
      description: editDescription,
      emoji: editEmoji,
      location: editLocation || undefined
    };
    
    // Optimistic update - update UI immediately
    setTripDays(prev => prev.map(day => 
      day.id === dayId 
        ? { 
            ...day,
            events: day.events.map(event => 
              event.id === eventId 
                ? { ...event, ...updateData }
                : event
            )
          }
        : day
    ));
    
    // Exit edit mode immediately for better UX
    setEditingEvent("");
    setEditTitle("");
    setEditDescription("");
    setEditEmoji("");
    setEditLocation("");
    setIsEditingDescription(false);
    
    try {
      await api.updateEvent(eventId, updateData);
    } catch (error) {
      console.error('Failed to update event:', error);
      setError('Failed to update event');
      
      // Rollback on error
      if (currentEvent) {
        setTripDays(prev => prev.map(day => 
          day.id === dayId 
            ? { 
                ...day,
                events: day.events.map(event => 
                  event.id === eventId ? currentEvent : event
                )
              }
            : day
        ));
      }
    } finally {
      setSavingEvent("");
    }
  }, [editTitle, editDescription, editEmoji, editLocation, savingEvent, tripDays, setTripDays, setError]);

  const cancelEventEdit = useCallback(() => {
    setEditingEvent("");
    setEditTitle("");
    setEditDescription("");
    setEditEmoji("");
    setEditLocation("");
    setIsEditingDescription(false);
  }, []);

  const addNewEvent = useCallback(async (dayId: string) => {
    try {
      const day = tripDays.find(d => d.id === dayId);
      const sortOrder = day ? day.events.length : 0;
      
      const result = await api.createEvent(dayId, {
        name: "New Event",
        description: "Add a description for this event",
        emoji: "✨",
        location: "Add location",
        sortOrder,
        participantIds: allParticipants.map(p => p.id)
      }) as any;
      
      const newEvent: TripEvent = {
        id: result.eventId,
        name: "New Event",
        description: "Add a description for this event",
        emoji: "✨",
        location: "Add location",
        photos: [],
        videos: [],
        participants: [...allParticipants]
      };
      
      // Update local state after successful API call
      setTripDays(prev => prev.map(day => 
        day.id === dayId 
          ? { ...day, events: [...day.events, newEvent] }
          : day
      ));
      
      // Immediately start editing the new event
      startEditingEvent(newEvent.id, newEvent.name, newEvent.description, newEvent.emoji, "Add location");
    } catch (error) {
      console.error('Failed to create event:', error);
      setError('Failed to create event');
    }
  }, [tripDays, allParticipants, setTripDays, setError, startEditingEvent]);

  const deleteEvent = useCallback(async (dayId: string, eventId: string) => {
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      try {
        await api.deleteEvent(eventId);
        
        // Update local state after successful API call
        setTripDays(prev => prev.map(day => 
          day.id === dayId 
            ? { ...day, events: day.events.filter(event => event.id !== eventId) }
            : day
        ));
        
        // Cancel any ongoing edit if this event was being edited
        if (editingEvent === eventId) {
          cancelEventEdit();
        }
      } catch (error) {
        console.error('Failed to delete event:', error);
        setError('Failed to delete event');
      }
    }
  }, [editingEvent, setTripDays, setError, cancelEventEdit]);

  return {
    // State
    editingEvent,
    savingEvent,
    editTitle,
    editDescription,
    editEmoji,
    editLocation,
    isEditingDescription,
    
    // Actions
    startEditingEvent,
    saveEventEdit,
    cancelEventEdit,
    addNewEvent,
    deleteEvent,
    
    // Setters for direct state updates
    setEditTitle,
    setEditDescription,
    setEditEmoji,
    setEditLocation,
    setIsEditingDescription
  };
}