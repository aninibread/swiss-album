import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { MediaComment } from '../types';

interface UseMediaCommentsProps {
  mediaId: string;
  currentUserId?: string;
}

export function useMediaComments({ mediaId, currentUserId }: UseMediaCommentsProps) {
  const [comments, setComments] = useState<MediaComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load comments for a media item
  const loadComments = useCallback(async () => {
    if (!mediaId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedComments = await api.getMediaComments(mediaId) as MediaComment[];
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  // Add a new comment
  const addComment = useCallback(async (content: string) => {
    if (!content.trim()) return false;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const newComment = await api.addMediaComment(mediaId, content.trim()) as MediaComment;
      
      // Add the new comment to the end of the list (chronological order)
      setComments(prev => [...prev, newComment]);
      
      return true;
    } catch (error) {
      console.error('Failed to add comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to add comment');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [mediaId]);

  // Update an existing comment
  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!content.trim()) return false;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const updatedComment = await api.updateComment(commentId, content.trim()) as MediaComment;
      
      // Update the comment in the list
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId ? updatedComment : comment
        )
      );
      
      return true;
    } catch (error) {
      console.error('Failed to update comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to update comment');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Delete a comment
  const deleteComment = useCallback(async (commentId: string) => {
    setSubmitting(true);
    setError(null);
    
    try {
      await api.deleteComment(commentId);
      
      // Remove the comment from the list
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      return true;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete comment');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Check if user can edit/delete a specific comment
  const canEditComment = useCallback((comment: MediaComment) => {
    return currentUserId === comment.userId;
  }, [currentUserId]);

  // Get comment count
  const commentCount = comments.length;

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    comments,
    loading,
    error,
    submitting,
    commentCount,
    
    // Actions
    loadComments,
    addComment,
    updateComment,
    deleteComment,
    canEditComment,
    clearError
  };
}