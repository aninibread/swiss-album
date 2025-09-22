import React, { useState, useEffect } from 'react';
import { CommentItem } from './CommentItem';
import { AddCommentForm } from './AddCommentForm';
import type { MediaComment } from '../../types';
import type { useCommentsManager } from '../../hooks';

interface CommentsListProps {
  mediaUrl: string;
  commentsManager: ReturnType<typeof useCommentsManager>;
  currentUserId?: string;
  maxHeight?: number;
  showAddForm?: boolean;
  onToggleAddForm?: (show: boolean) => void;
  hideAddButton?: boolean;
}

export function CommentsList({ 
  mediaUrl,
  commentsManager,
  currentUserId,
  maxHeight = 400,
  showAddForm = false,
  onToggleAddForm,
  hideAddButton = false
}: CommentsListProps) {
  const [showForm, setShowForm] = useState(showAddForm);
  
  const comments = commentsManager.getComments(mediaUrl);
  const loading = commentsManager.isLoading(mediaUrl);
  const isLoaded = commentsManager.isLoaded(mediaUrl);
  const error = commentsManager.getError(mediaUrl);
  const isSubmitting = commentsManager.isSubmitting(mediaUrl);

  // Load comments when component mounts if not already loaded
  useEffect(() => {
    if (!isLoaded && !loading) {
      commentsManager.loadComments(mediaUrl);
    }
  }, [mediaUrl, isLoaded, loading, commentsManager]);

  // Sync showForm with prop
  useEffect(() => {
    setShowForm(showAddForm);
  }, [showAddForm]);

  const handleToggleForm = (show: boolean) => {
    setShowForm(show);
    onToggleAddForm?.(show);
  };

  const handleAddComment = async (content: string): Promise<boolean> => {
    const success = await commentsManager.addComment(mediaUrl, content);
    if (success) {
      setShowForm(false);
      onToggleAddForm?.(false);
    }
    return success;
  };

  const handleEditComment = async (commentId: string, content: string): Promise<boolean> => {
    return await commentsManager.updateComment(mediaUrl, commentId, content);
  };

  const handleDeleteComment = async (commentId: string): Promise<boolean> => {
    return await commentsManager.deleteComment(mediaUrl, commentId);
  };

  const handleClearError = () => {
    commentsManager.clearError(mediaUrl);
  };

  if (loading && !isLoaded) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
        <div className="flex items-center justify-center space-x-2 text-stone-600">
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Loading comments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleClearError}
              className="text-xs text-stone-600 hover:text-stone-800 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => commentsManager.loadComments(mediaUrl)}
              className="text-xs text-stone-600 hover:text-stone-800 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Comments header - only title, no buttons */}
      <div className="mb-3">
        <h4 className="text-sm font-medium text-stone-900 flex items-center space-x-2">
          <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Comments ({comments.length})</span>
        </h4>
      </div>

      {/* Comments list */}
      {comments.length > 0 ? (
        <div 
          className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canEdit={commentsManager.canEditComment(comment)}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-dashed border-white/10 p-6 text-center">
          <div className="text-stone-600 text-sm">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="mb-1 font-medium">No comments yet</p>
            {currentUserId ? (
              <p className="text-xs text-stone-500">Be the first to share your thoughts!</p>
            ) : (
              <p className="text-xs text-stone-500">Sign in to add comments</p>
            )}
          </div>
        </div>
      )}

      {/* Bottom action bar - Add comment form or button */}
      {!hideAddButton && (
        showForm && currentUserId ? (
          <AddCommentForm
            onSubmit={handleAddComment}
            onCancel={() => handleToggleForm(false)}
            isSubmitting={isSubmitting}
            placeholder="Share your thoughts about this photo..."
          />
        ) : currentUserId ? (
          <div className="py-2">
            <button
              onClick={() => handleToggleForm(true)}
              className="flex items-center space-x-2 text-xs text-stone-600 hover:text-stone-800 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add comment</span>
            </button>
          </div>
        ) : null
      )}
    </div>
  );
}