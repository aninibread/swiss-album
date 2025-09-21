# Home.tsx Refactoring Plan

## Current State Analysis
The `home.tsx` file is **2,291 lines long** and contains a monolithic component handling multiple responsibilities including authentication, data management, UI rendering, and complex user interactions.

## Proposed Component Structure

### 1. **Authentication Components**
- `LoginForm.tsx` - Login form with validation and authentication logic
- `useAuth.tsx` - Custom hook for authentication state management

### 2. **Layout Components**
- `AppLayout.tsx` - Main layout wrapper with background and container
- `SideNavigation.tsx` - Left sidebar with day/event navigation
- `MainContent.tsx` - Content area wrapper

### 3. **Album Components**
- `AlbumHeader.tsx` - Header with title, stats, and logout button
- `FeaturedPhotos.tsx` - Highlights/random photos display section
- `AlbumStats.tsx` - Photo counts and participant statistics

### 4. **Trip Day Components**
- `TripDayCard.tsx` - Individual day card with header and events
- `DayHeader.tsx` - Day title, date, and edit controls
- `DayEditForm.tsx` - Editable form for day title and date
- `AddDayButton.tsx` - Button to create new trip days

### 5. **Event Components**
- `EventCard.tsx` - Individual event container
- `EventHeader.tsx` - Event name, description, emoji, participants
- `EventEditForm.tsx` - Editable form for event details
- `EventMediaGrid.tsx` - Photos and videos display
- `AddEventButton.tsx` - Button to add new events
- `EventDragHandle.tsx` - Drag and drop functionality

### 6. **Media Components**
- `MediaUpload.tsx` - File upload interface and logic
- `PhotoGrid.tsx` - Grid layout for photos
- `VideoGrid.tsx` - Grid layout for videos
- `MediaModal.tsx` - Full-screen media viewer
- `MediaItem.tsx` - Individual photo/video component
- `VideoContainer.tsx` - Existing video wrapper (can be reused)

### 7. **UI Components (Shared)**
- `EmojiPicker.tsx` - Emoji selection interface
- `ParticipantSelector.tsx` - Add/remove participants dropdown
- `DatePicker.tsx` - Custom date picker component
- `LocationAutocomplete.tsx` - Location search and selection
- `LoadingSpinner.tsx` - Loading state component
- `ErrorMessage.tsx` - Error display component
- `ConfirmDialog.tsx` - Delete confirmation modal

### 8. **Custom Hooks**
- `useAuth.tsx` - Authentication state and methods
- `useAlbumData.tsx` - Album data fetching and management
- `useEventEdit.tsx` - Event editing state and operations
- `useDayEdit.tsx` - Day editing state and operations
- `useMediaUpload.tsx` - File upload logic
- `useDragAndDrop.tsx` - Event reordering functionality
- `useScrollTracking.tsx` - Active day/event tracking
- `useClickOutside.tsx` - Close dropdowns when clicking outside
- `useLocationSearch.tsx` - Location search with debouncing

### 9. **Utility Components**
- `Portal.tsx` - Portal wrapper for modals and dropdowns
- `Tooltip.tsx` - Reusable tooltip component

### 10. **Types & Interfaces**
- `types/album.ts` - All TypeScript interfaces (TripDay, TripEvent, MediaItem, Participant)
- `types/ui.ts` - UI-specific types and enums

### 11. **Services**
- Keep existing `api.ts` service as-is

## Refactoring Strategy

### Phase 1: Foundation (Low Risk)
1. **Extract TypeScript interfaces** to `types/` directory
2. **Create utility hooks** (`useClickOutside`, `useScrollTracking`)
3. **Extract simple UI components** (`LoadingSpinner`, `ErrorMessage`, `Tooltip`)
4. **Move VideoContainer** to its own file

### Phase 2: Authentication (Medium Risk)
1. **Create `useAuth` hook** with login/logout logic
2. **Extract `LoginForm` component**
3. **Update main component** to use new auth hook

### Phase 3: Layout Structure (Medium Risk)
1. **Create `AppLayout`** wrapper component
2. **Extract `SideNavigation`** with day/event navigation
3. **Create `MainContent`** wrapper

### Phase 4: Data Management (Medium Risk)
1. **Create `useAlbumData` hook** for data fetching and state
2. **Create `useEventEdit` and `useDayEdit` hooks**
3. **Extract media upload logic** to `useMediaUpload`

### Phase 5: Content Components (High Risk)
1. **Extract `AlbumHeader`** and related components
2. **Create `TripDayCard`** and child components
3. **Extract event components** (`EventCard`, `EventHeader`, etc.)
4. **Create media components** (`MediaGrid`, `MediaModal`, etc.)

### Phase 6: Interactive Features (High Risk)
1. **Extract popup components** (`EmojiPicker`, `DatePicker`, etc.)
2. **Create drag-and-drop** components with `useDragAndDrop`
3. **Extract location search** functionality

## Benefits of This Structure

### Scalability
- **Single Responsibility**: Each component has one clear purpose
- **Reusability**: Components can be reused across the app
- **Testability**: Smaller components are easier to unit test
- **Team Development**: Multiple developers can work on different components

### Maintainability
- **Easier Debugging**: Issues isolated to specific components
- **Cleaner Code**: Logic separated by concern
- **Better Performance**: React can optimize smaller components
- **Easier Updates**: Changes contained to specific areas

### Future Features
- **Easy to Add**: New features can be added as new components
- **Plugin Architecture**: Components can be swapped or enhanced
- **Mobile Responsive**: Easier to create mobile-specific versions
- **Accessibility**: Easier to add ARIA labels and keyboard navigation

## File Structure
```
app/
├── components/
│   ├── album/
│   │   ├── AlbumHeader.tsx
│   │   ├── FeaturedPhotos.tsx
│   │   └── AlbumStats.tsx
│   ├── auth/
│   │   └── LoginForm.tsx
│   ├── day/
│   │   ├── TripDayCard.tsx
│   │   ├── DayHeader.tsx
│   │   ├── DayEditForm.tsx
│   │   └── AddDayButton.tsx
│   ├── event/
│   │   ├── EventCard.tsx
│   │   ├── EventHeader.tsx
│   │   ├── EventEditForm.tsx
│   │   ├── EventMediaGrid.tsx
│   │   ├── AddEventButton.tsx
│   │   └── EventDragHandle.tsx
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── SideNavigation.tsx
│   │   └── MainContent.tsx
│   ├── media/
│   │   ├── MediaUpload.tsx
│   │   ├── PhotoGrid.tsx
│   │   ├── VideoGrid.tsx
│   │   ├── MediaModal.tsx
│   │   ├── MediaItem.tsx
│   │   └── VideoContainer.tsx
│   ├── ui/
│   │   ├── EmojiPicker.tsx
│   │   ├── ParticipantSelector.tsx
│   │   ├── DatePicker.tsx
│   │   ├── LocationAutocomplete.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── Portal.tsx
│   │   └── Tooltip.tsx
│   └── index.ts (barrel exports)
├── hooks/
│   ├── useAuth.tsx
│   ├── useAlbumData.tsx
│   ├── useEventEdit.tsx
│   ├── useDayEdit.tsx
│   ├── useMediaUpload.tsx
│   ├── useDragAndDrop.tsx
│   ├── useScrollTracking.tsx
│   ├── useClickOutside.tsx
│   └── useLocationSearch.tsx
├── types/
│   ├── album.ts
│   └── ui.ts
└── routes/
    └── home.tsx (significantly reduced)
```

## Testing Strategy
- **Unit Tests**: Each component and hook individually
- **Integration Tests**: Component interactions
- **Visual Tests**: Screenshot testing for UI components
- **E2E Tests**: Complete user workflows

## Migration Approach
- **Incremental**: Refactor one phase at a time
- **Backwards Compatible**: Keep existing functionality during transition
- **Feature Flags**: Use flags to toggle between old/new components during development
- **Comprehensive Testing**: Test after each phase before moving to next

This refactoring will transform the monolithic 2,291-line component into a maintainable, scalable architecture with clear separation of concerns and excellent developer experience.