import React, { useState, useRef, useEffect } from 'react';
import type { MediaComment } from '../../types';

interface CommentItemProps {
  comment: MediaComment;
  canEdit: boolean;
  onEdit: (commentId: string, content: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
  isSubmitting: boolean;
}

export function CommentItem({ 
  comment, 
  canEdit, 
  onEdit, 
  onDelete, 
  isSubmitting 
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showActions, setShowActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus and resize when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // Auto-resize textarea during editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, isEditing]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false);
      setEditContent(comment.content);
      return;
    }

    const success = await onEdit(comment.id, editContent.trim());
    if (success) {
      setIsEditing(false);
      setShowActions(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      const success = await onDelete(comment.id);
      if (success) {
        setShowActions(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditContent(comment.content);
    }
  };

  const isUpdated = comment.createdAt !== comment.updatedAt;

  return (
    <div 
      className="group relative bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-3 hover:bg-white/15 transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => !isEditing && setShowActions(false)}
    >
      {/* Author info */}
      <div className="flex items-start space-x-3">
        <img
          src={comment.author.avatar}
          alt={comment.author.name}
          className="w-8 h-8 rounded-full border-2 border-white/30 shadow-sm flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-stone-900">
                {comment.author.name}
              </span>
              <span className="text-xs text-stone-600">
                {formatTimeAgo(comment.createdAt)}
                {isUpdated && (
                  <span className="ml-1 text-stone-500">(edited)</span>
                )}
              </span>
            </div>
            
            {/* Action buttons */}
            {canEdit && (showActions || isEditing) && (
              <div className="flex items-center space-x-1">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(comment.content);
                      }}
                      disabled={isSubmitting}
                      className="p-1 text-stone-500 hover:text-stone-700 rounded transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={handleEdit}
                      disabled={isSubmitting || !editContent.trim()}
                      className="p-1 text-stone-600 hover:text-stone-800 rounded transition-colors disabled:opacity-50 flex items-center"
                      title="Save changes"
                    >
                      {isSubmitting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      disabled={isSubmitting}
                      className="p-1 text-stone-500 hover:text-stone-700 rounded transition-colors disabled:opacity-50"
                      title="Edit comment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="p-1 text-stone-500 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                      title="Delete comment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Comment content */}
          <div className="text-sm text-stone-800 leading-relaxed">
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  className="w-full bg-white/20 border border-white/30 rounded-lg p-2 text-sm text-stone-900 resize-none outline-none focus:ring-2 focus:ring-stone-300/50 disabled:opacity-50"
                  style={{
                    minHeight: '60px',
                    lineHeight: '1.5'
                  }}
                />
                <div className="mt-1 text-xs text-stone-600">
                  <kbd className="px-1 py-0.5 bg-white/20 rounded">⌘</kbd>+
                  <kbd className="px-1 py-0.5 bg-white/20 rounded">Enter</kbd> to save, 
                  <kbd className="px-1 py-0.5 bg-white/20 rounded ml-1">Esc</kbd> to cancel
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}