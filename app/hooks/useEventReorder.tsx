import { useState } from 'react';
import type { TripDay } from '../types';

interface UseEventReorderProps {
  tripDays: TripDay[];
  setTripDays: React.Dispatch<React.SetStateAction<TripDay[]>>;
}

export function useEventReorder({ tripDays, setTripDays }: UseEventReorderProps) {
  const [draggedEvent, setDraggedEvent] = useState<{dayId: string, eventId: string} | null>(null);

  const handleDragStart = (e: React.DragEvent, dayId: string, eventId: string) => {
    setDraggedEvent({ dayId, eventId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback to the drop target
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent, targetDayId: string, targetEventId?: string) => {
    e.preventDefault();
    
    // Remove visual feedback
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    
    if (!draggedEvent) return;
    
    const { dayId: sourceDayId, eventId: sourceEventId } = draggedEvent;
    
    if (sourceDayId === targetDayId && sourceEventId === targetEventId) {
      setDraggedEvent(null);
      return;
    }

    setTripDays(prev => {
      const newDays = [...prev];
      
      // Find source day and event
      const sourceDayIndex = newDays.findIndex(day => day.id === sourceDayId);
      const sourceEventIndex = newDays[sourceDayIndex].events.findIndex(event => event.id === sourceEventId);
      const eventToMove = newDays[sourceDayIndex].events[sourceEventIndex];
      
      // Remove from source
      newDays[sourceDayIndex].events.splice(sourceEventIndex, 1);
      
      // Find target day and position
      const targetDayIndex = newDays.findIndex(day => day.id === targetDayId);
      
      if (targetEventId) {
        // Insert before target event
        const targetEventIndex = newDays[targetDayIndex].events.findIndex(event => event.id === targetEventId);
        newDays[targetDayIndex].events.splice(targetEventIndex, 0, eventToMove);
      } else {
        // Add to end of day
        newDays[targetDayIndex].events.push(eventToMove);
      }
      
      return newDays;
    });
    
    setDraggedEvent(null);
  };

  // Arrow-based reordering functions
  const moveEventUp = (dayId: string, eventId: string) => {
    setTripDays(prev => {
      const newDays = [...prev];
      const dayIndex = newDays.findIndex(day => day.id === dayId);
      
      if (dayIndex === -1) return prev;
      
      const day = { ...newDays[dayIndex] };
      const eventIndex = day.events.findIndex(event => event.id === eventId);
      
      if (eventIndex <= 0) return prev; // Already at the top or not found
      
      const newEvents = [...day.events];
      // Swap with previous event
      [newEvents[eventIndex - 1], newEvents[eventIndex]] = [newEvents[eventIndex], newEvents[eventIndex - 1]];
      
      day.events = newEvents;
      newDays[dayIndex] = day;
      
      return newDays;
    });
  };

  const moveEventDown = (dayId: string, eventId: string) => {
    setTripDays(prev => {
      const newDays = [...prev];
      const dayIndex = newDays.findIndex(day => day.id === dayId);
      
      if (dayIndex === -1) return prev;
      
      const day = { ...newDays[dayIndex] };
      const eventIndex = day.events.findIndex(event => event.id === eventId);
      
      if (eventIndex === -1 || eventIndex >= day.events.length - 1) return prev; // Already at the bottom or not found
      
      const newEvents = [...day.events];
      // Swap with next event
      [newEvents[eventIndex], newEvents[eventIndex + 1]] = [newEvents[eventIndex + 1], newEvents[eventIndex]];
      
      day.events = newEvents;
      newDays[dayIndex] = day;
      
      return newDays;
    });
  };

  // Helper functions to determine if events can be moved
  const canMoveEventUp = (dayId: string, eventId: string): boolean => {
    const day = tripDays.find(day => day.id === dayId);
    if (!day) return false;
    
    const eventIndex = day.events.findIndex(event => event.id === eventId);
    return eventIndex > 0;
  };

  const canMoveEventDown = (dayId: string, eventId: string): boolean => {
    const day = tripDays.find(day => day.id === dayId);
    if (!day) return false;
    
    const eventIndex = day.events.findIndex(event => event.id === eventId);
    return eventIndex >= 0 && eventIndex < day.events.length - 1;
  };

  return {
    draggedEvent,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    moveEventUp,
    moveEventDown,
    canMoveEventUp,
    canMoveEventDown
  };
}