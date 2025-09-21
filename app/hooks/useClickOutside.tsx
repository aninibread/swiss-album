import { useEffect, useRef } from 'react';

interface UseClickOutsideOptions {
  enabled?: boolean;
  onClickOutside: () => void;
  excludeSelectors?: string[];
}

export function useClickOutside(options: UseClickOutsideOptions) {
  const { enabled = true, onClickOutside, excludeSelectors = [] } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is inside any of the excluded selectors
      const isInsideExcluded = excludeSelectors.some(selector => 
        target.closest(selector)
      );
      
      if (!isInsideExcluded) {
        onClickOutside();
      }
    };

    const handleScroll = () => {
      onClickOutside();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [enabled, onClickOutside, excludeSelectors]);
}