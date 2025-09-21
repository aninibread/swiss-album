import { useEffect, useState } from 'react';
import type { TripDay } from '../types/album';

interface UseScrollTrackingOptions {
  tripDays: TripDay[];
  enabled?: boolean;
  scrollOffset?: number;
}

export function useScrollTracking(options: UseScrollTrackingOptions) {
  const { tripDays, enabled = true, scrollOffset = 200 } = options;
  const [activeDay, setActiveDay] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<string>("");

  // Set initial active day when tripDays are loaded
  useEffect(() => {
    if (enabled && tripDays.length > 0 && !activeDay) {
      setActiveDay(tripDays[0].id);
    }
  }, [tripDays, enabled, activeDay]);

  useEffect(() => {
    if (!enabled || tripDays.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + scrollOffset;

      for (const day of tripDays) {
        const dayElement = document.getElementById(`day-${day.id}`);
        if (dayElement) {
          const dayRect = dayElement.getBoundingClientRect();
          const dayTop = dayRect.top + window.scrollY;
          const dayBottom = dayTop + dayRect.height;

          if (scrollPosition >= dayTop && scrollPosition < dayBottom) {
            setActiveDay(day.id);

            for (const event of day.events) {
              const eventElement = document.getElementById(`event-${event.id}`);
              if (eventElement) {
                const eventRect = eventElement.getBoundingClientRect();
                const eventTop = eventRect.top + window.scrollY;
                const eventBottom = eventTop + eventRect.height;

                if (scrollPosition >= eventTop && scrollPosition < eventBottom) {
                  setActiveEvent(event.id);
                  break;
                }
              }
            }
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, [tripDays, enabled, scrollOffset]);

  return { activeDay, activeEvent };
}