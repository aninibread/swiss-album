import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { TripDay, Participant } from '../types';

interface UseDayEditOptions {
  tripDays: TripDay[];
  setTripDays: React.Dispatch<React.SetStateAction<TripDay[]>>;
  allParticipants: Participant[];
  setError: (error: string) => void;
}

export function useDayEdit(options: UseDayEditOptions) {
  const { tripDays, setTripDays, allParticipants, setError } = options;
  
  const [editingDay, setEditingDay] = useState<string>("");
  const [editDayTitle, setEditDayTitle] = useState<string>("");
  const [editDayDate, setEditDayDate] = useState<string>("");

  const startEditingDay = useCallback((dayId: string, title: string, date: string) => {
    setEditingDay(dayId);
    setEditDayTitle(title);
    setEditDayDate(date);
  }, []);

  const saveDayEdit = useCallback(async (dayId: string) => {
    try {
      // Validate inputs
      if (!editDayTitle.trim()) {
        setError('Day title cannot be empty');
        return;
      }
      
      if (!editDayDate) {
        setError('Please select a date');
        return;
      }
      
      await api.updateTripDay(dayId, {
        title: editDayTitle.trim(),
        date: editDayDate
      });
      
      // Update local state and reorder chronologically if date changed
      setTripDays(prev => {
        const updatedDays = prev.map(day => 
          day.id === dayId 
            ? { ...day, title: editDayTitle.trim(), date: editDayDate }
            : day
        );
        
        // Sort chronologically by date to maintain correct order
        return updatedDays.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
      });
      
      setEditingDay("");
      setEditDayTitle("");
      setEditDayDate("");
      setError(""); // Clear any previous errors
    } catch (error) {
      console.error('Failed to update day:', error);
      setError('Failed to update day: ' + (error as Error).message);
    }
  }, [editDayTitle, editDayDate, setTripDays, setError]);

  const cancelDayEdit = useCallback(() => {
    setEditingDay("");
    setEditDayTitle("");
    setEditDayDate("");
  }, []);

  const addNewDay = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      const result = await api.createTripDay('album-1', {
        title: 'New Day',
        date: today
      }) as any;
      
      if (!result.dayId) {
        throw new Error('No dayId returned from API');
      }
      
      // Create new day object
      const newDay: TripDay = {
        id: result.dayId,
        date: today,
        title: 'New Day',
        heroPhoto: "https://picsum.photos/800/600?random=" + Math.floor(Math.random() * 1000),
        photoCount: 0,
        backgroundColor: "bg-blue-100",
        participants: allParticipants,
        events: []
      };
      
      // Insert new day in correct chronological position
      setTripDays(prev => {
        const allDays = [...prev, newDay];
        // Sort chronologically by date
        return allDays.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
      });
      
      // Immediately start editing the new day
      startEditingDay(newDay.id, newDay.title, newDay.date);
      
      // Scroll to the new day after a brief delay to ensure it's rendered
      setTimeout(() => {
        const dayElement = document.getElementById(`day-${newDay.id}`);
        if (dayElement) {
          dayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Failed to create day:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        setError('A day with this date already exists');
      } else {
        setError('Failed to create day');
      }
    }
  }, [allParticipants, setTripDays, setError, startEditingDay]);

  const deleteDay = useCallback(async (dayId: string) => {
    const day = tripDays.find(d => d.id === dayId);
    if (!day) return;
    
    // Check if day has events
    if (day.events.length > 0) {
      setError('Cannot delete a day that has events');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${day.title}"? This action cannot be undone.`)) {
      try {
        await api.deleteTripDay(dayId);
        
        // Update local state after successful API call
        setTripDays(prev => prev.filter(d => d.id !== dayId));
        
        // Cancel any ongoing edit if this day was being edited
        if (editingDay === dayId) {
          setEditingDay("");
          setEditDayTitle("");
          setEditDayDate("");
        }
      } catch (error) {
        console.error('Failed to delete day:', error);
        if (error instanceof Error && error.message.includes('Cannot delete day with events')) {
          setError('Cannot delete a day that has events');
        } else {
          setError('Failed to delete day');
        }
      }
    }
  }, [tripDays, editingDay, setTripDays, setError]);

  return {
    // State
    editingDay,
    editDayTitle,
    editDayDate,
    
    // Actions
    startEditingDay,
    saveDayEdit,
    cancelDayEdit,
    addNewDay,
    deleteDay,
    
    // Setters for direct state updates
    setEditDayTitle,
    setEditDayDate
  };
}