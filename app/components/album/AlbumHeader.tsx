import React from 'react';

interface AlbumHeaderProps {
  title: string;
  subtitle: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AlbumHeader({ title, subtitle, onLogout, children }: AlbumHeaderProps) {
  return (
    <div className="px-4 lg:px-4 py-4 lg:py-6">
      <div className="bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-display font-semibold text-stone-900 mb-1 leading-tight">{title}</h1>
              <p className="text-sm lg:text-base text-stone-600">{subtitle}</p>
            </div>
            <button
              onClick={onLogout}
              className="opacity-30 hover:opacity-70 text-stone-600 hover:text-stone-800 p-2 rounded-lg transition-all duration-300 hover:bg-stone-200/30 group"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="border-t border-stone-forest/30 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}