import React from 'react';

interface Location {
  name: string;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

interface JourneyMapProps {
  title?: string;
  locations?: Location[];
}

const defaultLocations: Location[] = [
  { name: 'Zurich', position: { top: '4px', left: '50%' } },
  { name: 'Lucerne', position: { top: '50%', left: '33%' } },
  { name: 'Jungfraujoch', position: { bottom: '6px', right: '33%' } }
];

export function JourneyMap({ title = 'Our Journey', locations = defaultLocations }: JourneyMapProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-display font-medium text-stone-900 mb-3">{title}</h3>
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 h-40 lg:h-48 border border-stone-forest/30 shadow-sm mb-4 lg:mb-4">
        <div className="relative w-full h-full bg-gradient-to-br from-stone-forest/30 to-stone-forest/40 rounded-xl overflow-hidden">
          {/* Switzerland Map Representation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-stone-forest text-center">
              <div className="text-xs font-medium mb-2">SWITZERLAND</div>
              <div className="space-y-1">
                {locations.map((location) => (
                  <div key={location.name} className="flex items-center justify-center">
                    <div className="w-2 h-2 bg-stone-forest rounded-full mr-2 shadow-sm"></div>
                    <span className="text-xs">{location.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Location pins */}
          {locations.map((location, index) => (
            <div 
              key={`pin-${location.name}`}
              className="absolute w-3 h-3 bg-stone-forest rounded-full border-2 border-white shadow-md"
              style={{
                top: location.position.top,
                bottom: location.position.bottom,
                left: location.position.left,
                right: location.position.right,
                transform: location.position.left?.includes('%') ? 'translateX(-50%)' : undefined
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}