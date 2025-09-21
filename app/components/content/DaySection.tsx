import React from 'react';
import { DayHeader } from './DayHeader';
import type { TripDay, Participant } from '../../types';

interface DaySectionProps {
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
  children: React.ReactNode;
}

export function DaySection({
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
  datePickerButtonRefs,
  children
}: DaySectionProps) {
  return (
    <div key={day.id} id={`day-${day.id}`} className="mb-8 sm:mb-12">
      <DayHeader
        day={day}
        isEditMode={isEditMode}
        editingDay={editingDay}
        editDayTitle={editDayTitle}
        editDayDate={editDayDate}
        onEditDayTitle={onEditDayTitle}
        onEditDayDate={onEditDayDate}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onStartEdit={onStartEdit}
        onDeleteDay={onDeleteDay}
        onOpenDatePicker={onOpenDatePicker}
        getDayParticipants={getDayParticipants}
        datePickerButtonRefs={datePickerButtonRefs}
      />
      
      {/* Events Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-stone-forest/40 backdrop-blur-sm"></div>
        
        <div className="space-y-6 sm:space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}