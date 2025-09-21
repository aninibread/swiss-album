import React from 'react';
import type { TripDay, Participant } from '../../types';

interface DayHeaderProps {
  day: TripDay;
  isEditMode: boolean;
  editingDay: string;
  editDayTitle: string;
  editDayDate: string;
  onEditDayTitle: (value: string) => void;
  onEditDayDate: (date: string) => void;
  onSaveEdit: (dayId: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (dayId: string, title: string, date: string) => void;
  onDeleteDay: (dayId: string) => void;
  onOpenDatePicker: (dayId: string) => void;
  getDayParticipants: (day: TripDay) => Participant[];
  datePickerButtonRefs: React.MutableRefObject<{[key: string]: HTMLButtonElement | null}>;
}

export function DayHeader({
  day,
  isEditMode,
  editingDay,
  editDayTitle,
  editDayDate,
  onEditDayTitle,
  onEditDayDate,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDeleteDay,
  onOpenDatePicker,
  getDayParticipants,
  datePickerButtonRefs
}: DayHeaderProps) {
  const isEditing = editingDay === day.id;
  const dayParticipants = getDayParticipants(day);

  return (
    <div className="sticky top-0 z-40 bg-white/30 backdrop-blur-lg border-2 border-white/40 rounded-3xl shadow-xl mb-8 -mx-4 mx-0 px-4 sm:px-8 py-4 sm:py-6 group">
      <div className="flex items-center justify-between mb-2 sm:mb-3 relative">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editDayTitle}
              onChange={(e) => onEditDayTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSaveEdit(day.id);
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              className="text-lg sm:text-2xl font-display font-bold text-stone-900 tracking-tight bg-transparent border-none outline-none focus:outline-none resize-none hover:bg-white/10 focus:bg-white/10 rounded px-2 py-1 -mx-2 -my-1"
              placeholder="Day title..."
              autoFocus
            />
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative date-picker-dropdown">
                <button
                  ref={(el) => { datePickerButtonRefs.current[day.id] = el; }}
                  onClick={() => onOpenDatePicker(day.id)}
                  className="text-xs sm:text-sm font-medium text-stone-800 bg-stone-forest/20 px-2 sm:px-3 py-1 rounded-full border-none outline-none focus:outline-none hover:bg-stone-forest/30 focus:bg-stone-forest/30 cursor-pointer touch-manipulation"
                  data-date-picker
                >
                  {editDayDate || "Select date"}
                </button>
              </div>
              <button
                onClick={() => onSaveEdit(day.id)}
                className="p-1.5 sm:p-1 rounded-lg hover:bg-stone-200/50 transition-colors touch-manipulation"
                title="Save changes"
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg sm:text-2xl font-display font-bold text-stone-900 tracking-tight">{day.title}</h2>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-xs sm:text-sm font-medium text-stone-800 bg-stone-forest/20 px-2 sm:px-3 py-1 rounded-full">{day.date}</span>
              {isEditMode && (
                <div className="flex items-center space-x-1">
                  {day.events.length === 0 && (
                    <button
                      onClick={() => onDeleteDay(day.id)}
                      className="p-1.5 sm:p-1 rounded-lg hover:bg-red-200/50 transition-colors touch-manipulation"
                      title="Delete day (only available when no events)"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onStartEdit(day.id, day.title, day.date)}
                    className="p-1 rounded-lg hover:bg-stone-200/50 transition-colors touch-manipulation"
                    title="Edit day"
                  >
                    <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center space-x-4 sm:space-x-8 text-xs sm:text-sm text-stone-700 font-medium">
        <span className="flex items-center">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-stone-forest rounded-full mr-1.5 sm:mr-2"></div>
          {day.photoCount} photos
        </span>
        <span className="flex items-center">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-stone-forest rounded-full mr-1.5 sm:mr-2"></div>
          {day.events.length} events
        </span>
        {/* Day participants */}
        {dayParticipants.length > 0 && (
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center -space-x-1 sm:-space-x-2">
              {dayParticipants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 border-white/80 shadow-sm overflow-hidden bg-white/20 backdrop-blur-sm"
                  style={{ zIndex: 10 - index }}
                  title={participant.name}
                >
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}