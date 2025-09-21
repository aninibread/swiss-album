import React, { useState } from 'react';
import type { TripDay } from '../../types';

interface SideNavigationProps {
  tripDays: TripDay[];
  activeDay: string;
  activeEvent: string;
  onScrollToDay: (dayId: string) => void;
  onScrollToEvent: (eventId: string) => void;
}

export function SideNavigation({ 
  tripDays, 
  activeDay, 
  activeEvent, 
  onScrollToDay, 
  onScrollToEvent 
}: SideNavigationProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <>
      {/* Mobile Navigation Toggle - Bottom Right FAB */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[60]">
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="relative overflow-hidden p-4 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:bg-white/30 group"
        >
          {/* Glimmer overlay */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out">
            <div className="h-full w-8 bg-gradient-to-r from-transparent via-white/80 to-transparent transform -skew-x-12"></div>
          </div>
          
          <svg className="w-6 h-6 text-stone-700 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-[50]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />
          
          {/* Navigation Panel */}
          <div className="absolute left-0 top-0 h-full w-80 bg-white/90 backdrop-blur-md border-r border-white/40 shadow-xl overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-medium text-stone-900">Navigation</h2>
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1 text-stone-600 hover:text-stone-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                {tripDays.map((day) => (
                  <div key={day.id}>
                    <button
                      onClick={() => {
                        onScrollToDay(day.id);
                        setIsMobileNavOpen(false);
                      }}
                      className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                        activeDay === day.id 
                          ? 'bg-white/50 text-stone-900 font-medium shadow-sm backdrop-blur-sm' 
                          : 'text-stone-800 hover:bg-white/30 hover:backdrop-blur-sm'
                      }`}
                    >
                      <div className="text-base">{day.date}</div>
                      <div className="text-xs text-stone-600 mt-0.5">{day.title}</div>
                    </button>
                    
                    {/* Events list for active day */}
                    {activeDay === day.id && (
                      <div className="ml-4 mt-2 space-y-2">
                        {day.events.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => {
                              onScrollToEvent(event.id);
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full text-left py-1 px-2 rounded-lg text-sm transition-all ${
                              activeEvent === event.id
                                ? 'bg-bright-sky/20 text-stone-900 font-medium backdrop-blur-sm'
                                : 'text-stone-600 hover:bg-bright-sky/15 hover:backdrop-blur-sm hover:text-stone-800'
                            }`}
                          >
                            <span className="mr-2">{event.emoji}</span>
                            {event.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden lg:block w-80 sticky top-1/3 transform -translate-y-1/3 h-fit overflow-y-auto">
        <div className="p-4 lg:p-8">
        <div className="space-y-3">
          {tripDays.map((day) => (
            <div key={day.id}>
              <button
                onClick={() => onScrollToDay(day.id)}
                className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                  activeDay === day.id 
                    ? 'bg-white/30 text-stone-900 font-medium shadow-sm backdrop-blur-sm' 
                    : 'text-stone-800 hover:bg-white/20 hover:backdrop-blur-sm'
                }`}
              >
                <div className="text-base">{day.date}</div>
                <div className="text-xs text-stone-600 mt-0.5">{day.title}</div>
              </button>
              
              {/* Events list for active day */}
              {activeDay === day.id && (
                <div className="ml-4 mt-2 space-y-2">
                  {day.events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onScrollToEvent(event.id)}
                      className={`w-full text-left py-1 px-2 rounded-lg text-sm transition-all ${
                        activeEvent === event.id
                          ? 'bg-bright-sky/20 text-stone-900 font-medium backdrop-blur-sm'
                          : 'text-stone-600 hover:bg-bright-sky/15 hover:backdrop-blur-sm hover:text-stone-800'
                      }`}
                    >
                      <span className="mr-2">{event.emoji}</span>
                      {event.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </>
  );
}