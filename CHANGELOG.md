# Changelog

All notable changes to this project are documented here.

---

## [Unreleased] — Web Branch

### Added
- **Deep URL routing for Files**: Navigating into a folder now updates the URL to `/files/FolderName/SubFolder`. Direct access to any folder URL loads the correct path on mount; browser back/forward navigates folder history.
- **Copy link button on files and folders**: Each file and folder row/card now has a copy-link button (chain icon). For files it copies the direct stream URL; for folders it copies the shareable app URL.
- **URL-based view routing**: Navigating to Categories, Tracker, Radio, or Files syncs the browser URL (`/categories`, `/tracker`, `/radio`, `/files`). Refreshing or sharing the URL opens the correct view.
- **Mobile app layout**: Sidebar hidden on mobile with a bottom navigation bar (Categories, Tracker, Radio, Files, Settings). Active tab highlighted with an accent indicator.
- **Mobile compact player**: Full-width player bar on mobile with a 2 px progress strip, artwork thumbnail, and previous/play/next controls.
- **Mobile full-screen overlays**: Now Playing and Queue panels open as full-screen overlays on mobile instead of side panels.
- **Responsive Tracker**: Filter bar stacks on mobile; column headers and extra metadata columns hidden on narrow screens; always-visible play button on touch.
- **Responsive Files**: Audio play button always visible on mobile; file size and extension badges hidden on narrow screens.
- **Settings modal responsive**: Width capped and padded correctly on mobile.
- **SPA Vercel routing**: All paths (`/files`, `/categories`, etc.) rewrite to `index.html` on Vercel so direct URL access and page refreshes work correctly.

### Changed
- `setActiveView` in the Zustand store pushes browser history when switching views.
- Files `navigate()` pushes `/files/<path>` to browser history on folder entry; home navigation also pushes history.
- `App.tsx` uses prefix matching (`startsWith('/files')`) to handle deep file paths.

---

## [1.1.7]

### Added
- Settings persistence across sessions (theme, accent color, crossfade, sleep timer, audio output, playback speed).
- Era filter in Tracker view with expanded era list.
- Group-by-album option in Tracker.
- Clicking a category card navigates directly to a filtered Tracker view.

---

## [1.1.6]

### Added
- `ApiFilesView`: sort persistence (name/type/size), download button on file rows and cards.
- `ApiCategoryView`: full category browsing with grid and list layouts.

---

## [1.1.5]

### Added
- Now Playing panel with lyrics display (synced and static) and track info tab.
- Queue panel with drag-to-reorder and play-next support.
- Resizable side panels (drag handle).

---

## [1.1.0]

### Added
- Web branch: Electron stripped, Vite builds a standalone SPA deployed to Vercel.
- API-backed music player using juicewrldapi.com — Tracker, Radio, Files, and Categories views.
- Zustand store for global playback, UI, and settings state.
- Dark/light theme with custom accent color support.
