import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top',
  className = '' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className={`absolute ${positionClasses[position]} z-[10000] px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap animate-in fade-in duration-100 ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// Simple CSS-only tooltip that matches the original implementation
export function CssTooltip() {
  return (
    <style>{`
      [data-tooltip] {
        position: relative;
      }
      [data-tooltip]:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 10000;
        animation: tooltipFadeIn 0.1s ease-in;
      }
      @keyframes tooltipFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `}</style>
  );
}