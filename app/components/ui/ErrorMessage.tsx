import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'fullPage';
  className?: string;
}

export function ErrorMessage({ 
  message, 
  onRetry, 
  variant = 'inline', 
  className = '' 
}: ErrorMessageProps) {
  
  const baseClasses = "bg-red-50 border border-red-200 text-red-700";
  
  if (variant === 'fullPage') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className={`${baseClasses} rounded-lg p-6 max-w-md mx-auto ${className}`}>
            <p className="mb-4">{message}</p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} rounded-2xl p-4 shadow-sm ${className}`}>
        <p className="text-sm font-medium">{message}</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // inline variant
  return (
    <div className={`${baseClasses}/80 backdrop-blur-sm border-red-200/60 rounded-2xl p-4 text-sm font-medium shadow-sm ${className}`}>
      {message}
    </div>
  );
}