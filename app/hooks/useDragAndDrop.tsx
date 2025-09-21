import { useState } from 'react';
import type { TripDay } from '../types';

interface UseDragAndDropProps {
  tripDays: TripDay[];
  setTripDays: React.Dispatch<React.SetStateAction<TripDay[]>>;
}

export function useDragAndDrop({ tripDays, setTripDays }: UseDragAndDropProps) {
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

  return {
    draggedEvent,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}