import React, { useState } from 'react';
import { AddCommentForm } from '../ui/AddCommentForm';
import { CommentsList } from '../ui/CommentsList';
import type { MediaComment } from '../../types';
import type { useCommentsManager } from '../../hooks';

/**
 * Represents the different states a comment section can be in
 */
type CommentState = 'collapsed' | 'add-form' | 'expanded';

/**
 * Props for the MediaComments component
 */
interface MediaCommentsProps {
  /** URL of the media item these comments belong to */
  mediaUrl: string;
  /** Comments manager instance for handling comment operations */
  commentsManager: ReturnType<typeof useCommentsManager>;
  /** Current user ID, undefined if not logged in */
  currentUserId?: string;
  /** Initial state of the comments section */
  initialState?: CommentState;
}

/**
 * Time formatting utility for consistent timestamp display
 */
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
};

/**
 * Reusable comment icon component
 */
const CommentIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

/**
 * Reusable plus icon component
 */
const PlusIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

/**
 * Header component for comment sections
 */
const CommentsHeader: React.FC<{ commentCount: number }> = ({ commentCount }) => (
  <h4 className="text-sm font-medium text-stone-900 flex items-center space-x-2 mb-3">
    <CommentIcon className="w-4 h-4 text-stone-600" />
    <span>Comments ({commentCount})</span>
  </h4>
);

/**
 * Action button component for consistency
 */
const ActionButton: React.FC<{
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ onClick, icon, children }) => (
  <button
    onClick={onClick}
    className="flex items-center space-x-2 text-xs text-stone-600 hover:text-stone-800 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors cursor-pointer"
  >
    {icon}
    <span>{children}</span>
  </button>
);

/**
 * Comment preview component for collapsed state
 */
const CommentPreview: React.FC<{ comment: MediaComment }> = ({ comment }) => (
  <div className="mb-3">
    <div className="flex items-start space-x-3">
      <img
        src={comment.author.avatar}
        alt={comment.author.name}
        className="w-8 h-8 rounded-full border-2 border-white/30 shadow-sm flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-stone-900">
            {comment.author.name}
          </span>
          <span className="text-xs text-stone-600">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-stone-700 leading-relaxed break-words line-clamp-2">
          {comment.content}
        </p>
      </div>
    </div>
  </div>
);

/**
 * Compact comment item for add-form view
 */
const CompactCommentItem: React.FC<{ comment: MediaComment }> = ({ comment }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3">
    <div className="flex items-start space-x-3">
      <img
        src={comment.author.avatar}
        alt={comment.author.name}
        className="w-8 h-8 rounded-full border-2 border-white/30 shadow-sm flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-stone-900">
            {comment.author.name}
          </span>
          <span className="text-xs text-stone-600">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-stone-700 leading-relaxed break-words">
          {comment.content}
        </p>
      </div>
    </div>
  </div>
);

/**
 * MediaComments component handles all comment-related functionality for a media item
 * Supports collapsed, expanded, and add-comment states with smooth transitions
 */
export const MediaComments: React.FC<MediaCommentsProps> = ({
  mediaUrl,
  commentsManager,
  currentUserId,
  initialState = 'collapsed'
}) => {
  const [commentState, setCommentState] = useState<CommentState>(initialState);
  
  // Get comment data from manager
  const comments = commentsManager.getComments(mediaUrl);
  const isLoading = commentsManager.isLoading(mediaUrl);
  
  const hasComments = comments.length > 0;
  
  const latestComment = hasComments ? comments[comments.length - 1] : null;

  // Event handlers
  const handleCommentSubmit = async (content: string): Promise<boolean> => {
    const success = await commentsManager.addComment(mediaUrl, content);
    if (success) {
      setCommentState(hasComments ? 'expanded' : 'collapsed');
    }
    return success;
  };

  // Render collapsed state with comments
  const renderCollapsedWithComments = () => (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden comment-transition">
      <div className="p-3 pb-0">
        <CommentsHeader commentCount={comments.length} />
        {latestComment && <CommentPreview comment={latestComment} />}
      </div>
      
      <div className="border-t border-white/20 bg-white/5 px-3 py-2">
        <div className="flex items-center space-x-4">
          <ActionButton
            onClick={(e) => {
              setCommentState('expanded');
            }}
            icon={<CommentIcon />}
          >
            View all comments
          </ActionButton>
          
          {currentUserId && (
            <ActionButton
              onClick={(e) => {
                setCommentState('add-form');
              }}
              icon={<PlusIcon />}
            >
              Add comment
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );

  // Render collapsed state without comments
  const renderCollapsedEmpty = () => (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden comment-transition">
      <div className="bg-white/5 px-3 py-2">
        <div className="flex items-center space-x-4">
          <ActionButton
            onClick={(e) => {
              setCommentState('add-form');
            }}
            icon={<PlusIcon />}
          >
            Add comment
          </ActionButton>
        </div>
      </div>
    </div>
  );

  // Render add comment form state
  const renderAddForm = () => (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden comment-transition">
      {hasComments && (
        <div className="p-3 pb-0">
          <CommentsHeader commentCount={comments.length} />
          
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {comments.map((comment) => (
              <CompactCommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        </div>
      )}
      
      <div className={hasComments ? 'border-t border-white/20' : ''}>
        <AddCommentForm
          onSubmit={handleCommentSubmit}
          onCancel={() => setCommentState(hasComments ? 'expanded' : 'collapsed')}
          isSubmitting={commentsManager.isSubmitting(mediaUrl)}
          placeholder="Share your thoughts about this photo..."
          variant="embedded"
        />
      </div>
    </div>
  );

  // Render expanded state
  const renderExpanded = () => (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden comment-transition">
      <div className="p-3">
        <CommentsList
          mediaUrl={mediaUrl}
          commentsManager={commentsManager}
          currentUserId={currentUserId}
          maxHeight={300}
          showAddForm={false}
          onToggleAddForm={() => setCommentState('add-form')}
          hideAddButton={true}
        />
      </div>
      
      <div className="border-t border-white/20 bg-white/5 px-3 py-2">
        <div className="flex items-center space-x-4">
          <ActionButton
            onClick={(e) => setCommentState('collapsed')}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            }
          >
            Collapse
          </ActionButton>
          
          {currentUserId && (
            <ActionButton
              onClick={(e) => setCommentState('add-form')}
              icon={<PlusIcon />}
            >
              Add comment
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );

  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center space-x-2 text-stone-500 text-xs">
      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span>Loading comments...</span>
    </div>
  );

  // Main render logic
  if (isLoading && commentState === 'collapsed' && !hasComments) {
    return <div className="space-y-2">{renderLoading()}</div>;
  }


  return (
    <div className="space-y-2">
      {commentState === 'collapsed' && hasComments && renderCollapsedWithComments()}
      {commentState === 'collapsed' && !hasComments && currentUserId && renderCollapsedEmpty()}
      {commentState === 'add-form' && renderAddForm()}
      {commentState === 'expanded' && renderExpanded()}
    </div>
  );
};