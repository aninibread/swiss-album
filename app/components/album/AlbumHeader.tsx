import React from 'react';

interface AlbumHeaderProps {
  title: string;
  subtitle: string;
  isEditMode: boolean;
  onEditModeToggle: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AlbumHeader({ title, subtitle, isEditMode, onEditModeToggle, onLogout, children }: AlbumHeaderProps) {
  return (
    <div className="px-4 lg:px-4 py-4 lg:py-6">
      <div className="bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-display font-semibold text-stone-900 mb-1 leading-tight">{title}</h1>
              <p className="text-sm lg:text-base text-stone-600">{subtitle}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onEditModeToggle}
                className={`relative overflow-hidden px-3 py-1.5 rounded-xl text-sm font-medium transition-all group ${
                  isEditMode 
                    ? 'bg-white/50 text-stone-900 font-medium shadow-sm backdrop-blur-sm hover:shadow-lg' 
                    : 'text-stone-800 hover:bg-white/30 hover:backdrop-blur-sm hover:shadow-sm'
                }`}
                title={isEditMode ? "Exit edit mode" : "Enter edit mode"}
              >
                {/* Shimmer overlay - only visible when not in edit mode */}
                {!isEditMode && (
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out">
                    <div className="h-full w-8 bg-gradient-to-r from-transparent via-white/80 to-transparent transform -skew-x-12"></div>
                  </div>
                )}
                {isEditMode ? (
                  <>
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </>
                )}
              </button>
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
        </div>
        
        <div className="border-t border-stone-forest/30 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}