import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { TripDay, Participant } from '../types';

export function useAlbumData() {
  const [tripDays, setTripDays] = useState<TripDay[]>([]);
  const [albumData, setAlbumData] = useState<any>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAlbumData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getAlbumFull('album-1') as any;
      setAlbumData(data);
      setTripDays(data.days || []);
      setAllParticipants(data.participants || []);
    } catch (err) {
      setError('Failed to load album data');
      console.error('Error loading album:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAlbumData = useCallback(() => {
    setTripDays([]);
    setAlbumData(null);
    setAllParticipants([]);
    setError("");
  }, []);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  return {
    // State
    tripDays,
    albumData,
    allParticipants,
    isLoading,
    error,
    
    // Actions
    loadAlbumData,
    clearAlbumData,
    clearError,
    
    // Direct state setters (for components that need to update the state)
    setTripDays,
    setAlbumData,
    setAllParticipants
  };
}