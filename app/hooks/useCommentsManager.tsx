import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import type { MediaComment } from '../types';
import { getMediaId } from '../utils/mediaHelpers';

interface CommentsState {
  [mediaId: string]: {
    comments: MediaComment[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
  };
}

interface UseCommentsManagerProps {
  currentUserId?: string;
}

export function useCommentsManager({ currentUserId }: UseCommentsManagerProps = {}) {
  const [commentsState, setCommentsState] = useState<CommentsState>({});
  const [submitting, setSubmitting] = useState<string | null>(null); // MediaId currently being submitted
  
  // Keep track of which media has been requested to avoid duplicate requests
  const loadingRef = useRef<Set<string>>(new Set());

  // Get comments for a specific media item
  const getComments = useCallback((mediaUrl: string): MediaComment[] => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId) return [];
    return commentsState[mediaId]?.comments || [];
  }, [commentsState]);

  // Get loading state for a specific media item
  const isLoading = useCallback((mediaUrl: string): boolean => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId) return false;
    return commentsState[mediaId]?.loading || false;
  }, [commentsState]);

  // Get error state for a specific media item
  const getError = useCallback((mediaUrl: string): string | null => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId) return null;
    return commentsState[mediaId]?.error || null;
  }, [commentsState]);

  // Check if comments are loaded for a media item
  const isLoaded = useCallback((mediaUrl: string): boolean => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId) return false;
    return commentsState[mediaId]?.loaded || false;
  }, [commentsState]);

  // Load comments for a media item
  const loadComments = useCallback(async (mediaUrl: string) => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId) return;

    // Prevent duplicate requests
    if (loadingRef.current.has(mediaId)) return;
    
    // Don't reload if already loaded and no error
    if (commentsState[mediaId]?.loaded && !commentsState[mediaId]?.error) return;

    loadingRef.current.add(mediaId);

    setCommentsState(prev => ({
      ...prev,
      [mediaId]: {
        ...prev[mediaId],
        loading: true,
        error: null
      }
    }));

    try {
      const comments = await api.getMediaComments(mediaId) as MediaComment[];
      
      setCommentsState(prev => ({
        ...prev,
        [mediaId]: {
          comments,
          loading: false,
          loaded: true,
          error: null
        }
      }));
    } catch (error) {
      console.error('Failed to load comments:', error);
      
      setCommentsState(prev => ({
        ...prev,
        [mediaId]: {
          comments: [],
          loading: false,
          loaded: false,
          error: error instanceof Error ? error.message : 'Failed to load comments'
        }
      }));
    } finally {
      loadingRef.current.delete(mediaId);
    }
  }, [commentsState]);

  // Add a comment to a media item
  const addComment = useCallback(async (mediaUrl: string, content: string): Promise<boolean> => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId || !content.trim()) return false;

    setSubmitting(mediaId);

    try {
      const newComment = await api.addMediaComment(mediaId, content.trim()) as MediaComment;

      setCommentsState(prev => ({
        ...prev,
        [mediaId]: {
          ...prev[mediaId],
          comments: [...(prev[mediaId]?.comments || []), newComment],
          loaded: true,
          error: null
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to add comment:', error);
      
      setCommentsState(prev => ({
        ...prev,
        [mediaId]: {
          ...prev[mediaId],
          error: error instanceof Error ? error.message : 'Failed to add comment'
        }
      }));

      return false;
    } finally {
      setSubmitting(null);
    }
  }, []);

  // Update a comment
  const updateComment = useCallback(async (mediaUrl: string, commentId: string, content: string): Promise<boolean> => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId || !content.trim()) return false;

    setSubmitting(mediaId);

    try {
      const updatedComment = await api.updateComment(commentId, content.trim()) as MediaComment;

      setCommentsState(prev => ({
        ...prev,
        [mediaId]: {
          ...prev[mediaId],
          comments: prev[mediaId]?.comments.map(comment =>
            comment.id === commentId ? updatedComment : comment
          ) || [],
          error: null
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to update comment:', error);
      
      setCommentsState(prev => ({
        ...prev,
        [mediaId]: {
          ...prev[mediaId],
          error: error instanceof Error ? error.message : 'Failed to update comment'
        }
      }));

      return false;
    } finally {
      setSubmitting(null);
    }
  }, []);

  // Delete a comment
  const deleteComment = useCallback(async (mediaUrl: string, commentId: string): Promise<boolean> => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId) return false;

    setSubmitting(mediaId);

    try {
      await api.deleteComment(commentId);

      setCommentsState(prev => ({
        ...prev,
        [mediaId]: {
          ...prev[mediaId],
          comments: prev[mediaId]?.comments.filter(comment => comment.id !== commentId) || [],
          error: null
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      
      setCommentsState(prev => ({
        ...prev,
        [mediaId]: {
          ...prev[mediaId],
          error: error instanceof Error ? error.message : 'Failed to delete comment'
        }
      }));

      return false;
    } finally {
      setSubmitting(null);
    }
  }, []);

  // Check if user can edit a comment
  const canEditComment = useCallback((comment: MediaComment): boolean => {
    return currentUserId === comment.userId;
  }, [currentUserId]);

  // Get comment count for a media item
  const getCommentCount = useCallback((mediaUrl: string): number => {
    return getComments(mediaUrl).length;
  }, [getComments]);

  // Check if currently submitting for a media item
  const isSubmitting = useCallback((mediaUrl: string): boolean => {
    const mediaId = getMediaId(mediaUrl);
    return submitting === mediaId;
  }, [submitting]);

  // Clear error for a media item
  const clearError = useCallback((mediaUrl: string) => {
    const mediaId = getMediaId(mediaUrl);
    if (!mediaId) return;

    setCommentsState(prev => ({
      ...prev,
      [mediaId]: {
        ...prev[mediaId],
        error: null
      }
    }));
  }, []);

  return {
    // Data getters
    getComments,
    getCommentCount,
    isLoading,
    isLoaded,
    isSubmitting,
    getError,
    
    // Actions
    loadComments,
    addComment,
    updateComment,
    deleteComment,
    canEditComment,
    clearError
  };
}