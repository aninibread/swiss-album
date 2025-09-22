import React from 'react';
import type { useCommentsManager } from '../../hooks';

interface CommentButtonProps {
  mediaUrl: string;
  commentsManager: ReturnType<typeof useCommentsManager>;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

export function CommentButton({ 
  mediaUrl,
  commentsManager,
  isActive = false,
  onClick,
  className = ""
}: CommentButtonProps) {
  const commentCount = commentsManager.getCommentCount(mediaUrl);
  const isLoading = commentsManager.isLoading(mediaUrl);

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden group flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-all touch-manipulation ${
        isActive 
          ? 'bg-white/40 text-stone-900 shadow-sm backdrop-blur-sm' 
          : 'text-stone-600 hover:bg-white/20 hover:text-stone-800'
      } ${className}`}
      title={`${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
    >
      {/* Glimmer effect on hover when not active */}
      {!isActive && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out">
          <div className="h-full w-6 bg-gradient-to-r from-transparent via-white/60 to-transparent transform -skew-x-12"></div>
        </div>
      )}
      
      {/* Comment icon with loading state */}
      <div className="relative z-10">
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </div>
      
      {/* Comment count */}
      {commentCount > 0 && (
        <span className="text-xs font-medium relative z-10">
          {commentCount}
        </span>
      )}
    </button>
  );
}