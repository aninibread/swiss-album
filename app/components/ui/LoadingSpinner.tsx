import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const spinnerClass = sizeClasses[size];

  if (text) {
    return (
      <div className={`flex items-center justify-center space-x-2 ${className}`}>
        <div className={`animate-spin rounded-full ${spinnerClass} border-2 border-blue-300 border-t-blue-600`}></div>
        <span className="text-gray-600">{text}</span>
      </div>
    );
  }

  return (
    <div className={`animate-spin rounded-full ${spinnerClass} border-2 border-blue-300 border-t-blue-600 ${className}`}></div>
  );
}

// Full page loading component
export function FullPageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}