import React, { useState, useRef, useEffect } from 'react';

interface AddCommentFormProps {
  onSubmit: (content: string) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting: boolean;
  placeholder?: string;
  maxLength?: number;
  variant?: 'standalone' | 'embedded';
}

export function AddCommentForm({ 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  placeholder = "Add a comment...",
  maxLength = 1000,
  variant = 'standalone'
}: AddCommentFormProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    const success = await onSubmit(content.trim());
    if (success) {
      setContent('');
      onCancel(); // Close the form after successful submission
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;

  const containerClasses = variant === 'embedded' 
    ? "" 
    : "bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg overflow-hidden";

  return (
    <div className={containerClasses}>
      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="relative p-3 pb-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSubmitting}
            className={`w-full bg-transparent border-none outline-none resize-none placeholder-stone-500 text-stone-900 text-sm leading-relaxed min-h-[60px] max-h-[150px] ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              minHeight: '60px',
              lineHeight: '1.5'
            }}
          />
          
          {/* Character count */}
          {isFocused && (
            <div className={`absolute bottom-1 right-3 text-xs ${
              isOverLimit ? 'text-red-600' : 'text-stone-500'
            }`}>
              {remainingChars}
            </div>
          )}
        </div>

        <div className={`flex items-center justify-between px-3 py-2 ${variant === 'embedded' ? 'bg-white/5 border-t border-white/10' : 'bg-white/10 border-t border-white/20'}`}>
          <div className="text-xs text-stone-600">
            {isFocused && (
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-xs font-mono">⌘</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-xs font-mono">Enter</kbd>
                <span className="text-stone-500">to submit</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-800 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || !content.trim() || isOverLimit}
              className="px-3 py-1.5 text-xs font-medium bg-stone-700 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Posting...</span>
                </>
              ) : (
                <span>Post</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}