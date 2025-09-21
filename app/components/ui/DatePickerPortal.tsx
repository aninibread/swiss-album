import React, { useState } from 'react';
import { createPortal } from 'react-dom';

interface DatePickerPortalProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  onDateSelect: (date: string) => void;
  onClose: () => void;
}

export function DatePickerPortal({
  isOpen,
  position,
  onDateSelect,
  onClose
}: DatePickerPortalProps) {
  const [datePickerMonth, setDatePickerMonth] = useState<{year: number, month: number}>({ 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() 
  });

  // Close date picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.date-picker-dropdown') && !target.closest('[data-date-picker]')) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, onClose]);

  // Reset to current month when opening
  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDatePickerMonth({ year: now.getFullYear(), month: now.getMonth() });
    }
  }, [isOpen]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setDatePickerMonth(prev => {
      const newMonth = direction === 'next' ? prev.month + 1 : prev.month - 1;
      const newYear = prev.year + Math.floor(newMonth / 12) - Math.floor((newMonth < 0 ? -1 : 0));
      const adjustedMonth = ((newMonth % 12) + 12) % 12;
      return { year: newYear, month: adjustedMonth };
    });
  };

  const handleDateSelect = (date: string) => {
    onDateSelect(date);
    onClose();
  };

  if (!isOpen || !position || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div 
      data-date-picker
      className="fixed"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      <div className="bg-white/95 backdrop-blur-sm border border-stone-300/50 rounded-lg shadow-lg p-4 min-w-[280px] date-picker-dropdown">
        <div className="grid grid-cols-7 gap-1 text-xs">
          {/* Calendar Header with Navigation */}
          <div className="col-span-7 flex items-center justify-between mb-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-stone-200/60 rounded transition-colors"
              title="Previous month"
            >
              <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center font-medium text-stone-700">
              {new Date(datePickerMonth.year, datePickerMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-stone-200/60 rounded transition-colors"
              title="Next month"
            >
              <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* Day Labels */}
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-stone-500 font-medium py-1">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {(() => {
            const now = new Date();
            const year = datePickerMonth.year;
            const month = datePickerMonth.month;
            const firstDay = new Date(year, month, 1);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            const days = [];
            for (let i = 0; i < 42; i++) {
              const currentDate = new Date(startDate);
              currentDate.setDate(startDate.getDate() + i);
              const isCurrentMonth = currentDate.getMonth() === month;
              const isToday = currentDate.toDateString() === now.toDateString();
              
              days.push(
                <button
                  key={i}
                  onClick={() => {
                    const dateStr = currentDate.toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    });
                    handleDateSelect(dateStr);
                  }}
                  className={`
                    p-1 text-center rounded hover:bg-stone-200/60 transition-colors
                    ${isCurrentMonth ? 'text-stone-800' : 'text-stone-400'}
                    ${isToday ? 'bg-stone-forest/20 font-medium' : ''}
                  `}
                >
                  {currentDate.getDate()}
                </button>
              );
            }
            return days;
          })()}
        </div>
        
        {/* Quick Options */}
        <div className="mt-3 pt-3 border-t border-stone-200/50 flex flex-wrap gap-2">
          {[
            'Today',
            'Yesterday',
            'Tomorrow'
          ].map((option) => (
            <button
              key={option}
              onClick={() => {
                let date = new Date();
                if (option === 'Yesterday') date.setDate(date.getDate() - 1);
                if (option === 'Tomorrow') date.setDate(date.getDate() + 1);
                
                const dateStr = date.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                });
                handleDateSelect(dateStr);
              }}
              className="px-2 py-1 text-xs bg-stone-100/80 hover:bg-stone-200/80 rounded text-stone-700 transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}