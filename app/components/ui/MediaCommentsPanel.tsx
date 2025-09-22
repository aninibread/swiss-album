import React, { useState } from 'react';
import { CommentsList } from './CommentsList';
import { CommentButton } from './CommentButton';
import type { useCommentsManager } from '../../hooks';

interface MediaCommentsPanelProps {
  mediaUrl: string;
  commentsManager: ReturnType<typeof useCommentsManager>;
  currentUserId?: string;
  position?: 'overlay' | 'inline' | 'modal';
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  className?: string;
}

export function MediaCommentsPanel({
  mediaUrl,
  commentsManager,
  currentUserId,
  position = 'overlay',
  isOpen = false,
  onToggle,
  className = ""
}: MediaCommentsPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const commentCount = commentsManager.getCommentCount(mediaUrl);
  const actualIsOpen = onToggle ? isOpen : internalIsOpen;
  
  const handleToggle = () => {
    const newValue = !actualIsOpen;
    if (onToggle) {
      onToggle(newValue);
    } else {
      setInternalIsOpen(newValue);
    }
    
    // Reset add form when closing
    if (!newValue) {
      setShowAddForm(false);
    }
  };

  const handleToggleAddForm = (show: boolean) => {
    setShowAddForm(show);
  };

  if (position === 'overlay') {
    return (
      <div className={`relative ${className}`}>
        {/* Comment Button */}
        <div className="absolute top-2 right-2 z-20">
          <CommentButton
            mediaUrl={mediaUrl}
            commentsManager={commentsManager}
            isActive={actualIsOpen}
            onClick={handleToggle}
          />
        </div>

        {/* Comments Overlay */}
        {actualIsOpen && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/60 via-black/40 to-transparent backdrop-blur-sm rounded-b-xl">
            <div className="p-4 pt-8">
              <div className="bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-xl p-4 max-h-80 overflow-hidden">
                <CommentsList
                  mediaUrl={mediaUrl}
                  commentsManager={commentsManager}
                  currentUserId={currentUserId}
                  maxHeight={240}
                  showAddForm={showAddForm}
                  onToggleAddForm={handleToggleAddForm}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (position === 'inline') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Comment Button */}
        <div className="flex justify-center">
          <CommentButton
            mediaUrl={mediaUrl}
            commentsManager={commentsManager}
            isActive={actualIsOpen}
            onClick={handleToggle}
            className="shadow-sm"
          />
        </div>

        {/* Inline Comments */}
        {actualIsOpen && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4">
            <CommentsList
              mediaUrl={mediaUrl}
              commentsManager={commentsManager}
              currentUserId={currentUserId}
              maxHeight={400}
              showAddForm={showAddForm}
              onToggleAddForm={handleToggleAddForm}
            />
          </div>
        )}
      </div>
    );
  }

  if (position === 'modal') {
    return (
      <>
        {/* Comment Button */}
        <div className={className}>
          <CommentButton
            mediaUrl={mediaUrl}
            commentsManager={commentsManager}
            isActive={actualIsOpen}
            onClick={handleToggle}
          />
        </div>

        {/* Modal Overlay */}
        {actualIsOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleToggle}
            />
            
            {/* Modal Content */}
            <div className="relative min-h-full flex items-center justify-center p-4">
              <div className="relative bg-white/90 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/20">
                  <h3 className="text-lg font-medium text-stone-900">Comments</h3>
                  <button
                    onClick={handleToggle}
                    className="p-2 text-stone-500 hover:text-stone-700 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Comments Content */}
                <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
                  <CommentsList
                    mediaUrl={mediaUrl}
                    commentsManager={commentsManager}
                    currentUserId={currentUserId}
                    maxHeight={600}
                    showAddForm={showAddForm}
                    onToggleAddForm={handleToggleAddForm}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}