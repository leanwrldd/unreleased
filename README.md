# unreleased

A music player built with Electron, React, and TypeScript — designed for your local library and the [Juice WRLD API](https://juicewrldapi.com).

![Version](https://img.shields.io/badge/version-1.1.7-blue)
![Electron](https://img.shields.io/badge/Electron-33-47848F)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

---

## Features

**Local mode**
- Library scanning with folder management and scan filters
- Albums, Artists, and Genres browser
- Playlists with drag-and-drop, folders, pinning, and sorting
- Metadata editor with cover art, lyrics, bitrate info, and album art export
- Liked Songs, playback speed, crossfade, sleep timer
- Queue panel with drag-to-reorder
- Now Playing panel with synced lyrics
- File browser — navigate your filesystem and play audio inline
- Image viewer and video player built in
- Multi-select with batch actions
- Persistent settings across restarts

**API mode** (powered by [juicewrldapi.com](https://juicewrldapi.com))
- Tracker — browse, search, and filter thousands of songs by category and era
- Categories view — browse Released, Unreleased, Unsurfaced, and Sessions with song counts; drill into Eras
- Radio — random song playback with skip
- API File browser — navigate the API filesystem, play audio, and download files
- Cover art, album, era, and lyrics fetched automatically from the API
- All view and filter settings persist across sessions

---

## Stack

- **Electron 33** + **electron-vite**
- **React 18** + **TypeScript**
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Prisma** — not used yet, planned for playlist sync
- **music-metadata** for local file tag reading

---

## Getting Started

```bash
# Install dependencies
npm install

# Start in development
npm run dev

# Build for production
npm run build
```

---

## Credits

- **[juicewrldapi.com](https://juicewrldapi.com)** — the API that powers API mode: song metadata, streaming, lyrics, eras, categories, and the file browser. This project would not exist without it.
- **juicewrldapi** (X) on Discord — for the help and support building the integration.

---

## Changelog

### v1.1.7 — 2026-06-17
- **Fix** — View mode (list/grid), sort order, column visibility, and scan filters now persist across restarts
- **New** — Eras section in the Categories view — browse all eras as cards, click any to open the Tracker filtered by that era
- **New** — Category badges in the Tracker are now clickable — click to jump to the Categories view
- **New** — "By album" toggle in Tracker and Categories — groups songs by era/album with section headers; default off, persists across sessions

### v1.1.6 — 2026-06-17
- **Fix** — API track cover art, album, and era info now show up correctly in the player bar and Now Playing panel
- **Fix** — App now opens directly on the Tracker when API mode was last active — no more landing on the local library
- **New** — Lyrics fetched from the API when streaming a song that has no embedded lyrics
- **New** — Categories view in API mode — browse Released, Unreleased, Unsurfaced, and Sessions with song counts, click to open the Tracker pre-filtered
- **New** — Download button on every file in the API Files browser — saves to the Downloads folder (or a custom folder set in Settings)
- **New** — Sort by name, type, or size in the API Files browser — sort settings persist across sessions

### v1.1.5 — 2026-06-17
- **New** — Image viewer — click any image in the file browser to open a fullscreen lightbox with arrow-key navigation and a filmstrip
- **New** — Video player — click any video file to play it inline in the app, with a fallback download link for unsupported formats
- **New** — Grid view for both file browsers (local and API) — toggle between list and card grid with thumbnails
- **Improve** — Local file browser now shows images and videos alongside audio files (not just audio)

### v1.1.4 — 2026-06-17
- **New** — API Files — browse the Juice WRLD API filesystem directly from the sidebar in API mode
- **New** — Play any audio file from the API browser with cover art and a full directory queue

### v1.1.3 — 2026-06-17
- **New** — File browser — navigate your local filesystem and play audio files directly
- **New** — Tracker grid view — toggle between list and card grid layout with the view switcher
- **New** — Jump-to-page in Tracker — click the page number and type any page to jump instantly
- **Improve** — Error boundary now shows full crash details, stack trace, copy button, and saves a crash log to disk
- **Improve** — Local playlists hidden in API mode for a cleaner sidebar
- **Fix** — Edit song button hidden in API mode (editing API tracks is not supported)
- **Fix** — Windows taskbar icon now correct size (multi-resolution .ico)
- **Fix** — Volume slider now vertically centered in the player bar

### v1.1.2 — 2026-06-17
- **New** — Local / API mode toggle in sidebar — switch between your local library and the Juice WRLD API
- **New** — Tracker — browse and search thousands of songs from the API with category and era filters
- **New** — Radio — plays a random song from the API; skip to get another

### v1.1.1 — 2026-06-17
- **New** — Playlists page is now sortable — sort by Name, Date added, or Custom order
- **New** — Provider status dots now ping the URL and turn green (online) or red (offline)

### v1.1.0 — 2026-06-17
- **New** — Providers section in Settings — add URLs for external services, with a status indicator light per provider

### v1.0.9 — 2026-06-16
- **New** — Playlists page — click Playlists in the sidebar to see all playlists as a cover art grid
- **New** — Synced lyrics tab in Lyrics view
- **Improve** — Lyrics view: song list now shows cover art thumbnails and tighter layout
- **Fix** — Pen icon in Now Playing panel now correctly opens the metadata editor

### v1.0.8 — 2026-06-16
- **New** — Lyrics browser — browse all songs' lyrics and full-text search across your library
- **New** — Albums list view — toggle between grid and list, with customizable columns
- **New** — Playlist large list view — see cover art thumbnails next to playlist names in the sidebar
- **Fix** — Clicking artist name in the player bar now navigates to their artist page
- **Fix** — Version saved in About now persists across app restarts
- **Improve** — Scan Filters section in Settings is now collapsible

### v1.0.7 — 2026-06-16
- **New** — Liked Songs — heart button in player bar, Liked Songs page in sidebar, persists across restarts
- **New** — Metadata editor shows bitrate, sample rate, bit depth, channels, and file size
- **New** — Clicking genre text in song rows navigates to that genre's page
- **New** — Sort by Genre column now works
- **Fix** — Editing another song's metadata no longer changes the currently playing song's album cover
- **Fix** — Creating folders inside folders now works inline
- **Improve** — Genre card colors are now vivid and correct in both light and dark mode

### v1.0.6 — 2026-06-16
- **New** — Nested playlist folders
- **New** — Playback speed control (0.5×–2×) in player bar, persists across restarts
- **New** — Genre right-click context menu — Play, Add to queue, Add to playlist
- **Fix** — Seek bar no longer makes noise while scrubbing — audio only seeks on mouse release
- **Fix** — Left-click now selects songs; right-click is purely for the context menu
- **Fix** — Metadata editor opens correctly again
- **Improve** — Folder rows are now larger and bolder than playlist rows in the sidebar

### v1.0.5 — 2026-06-16
- **New** — Playlist folders — group playlists into collapsible folders
- **New** — Pin playlists to the top of the sidebar
- **New** — Sort playlists by name, date added, or custom order
- **New** — Add entire playlist to queue from sidebar context menu
- **Improve** — Multi-select now only activates via Ctrl+click or Select button
- **Improve** — Multi-select works in album/artist/genre drill-down views
- **Improve** — Cover art loading optimized — faster queue scrolling

### v1.0.4 — 2026-06-16
- **Fix** — Accent color now applies everywhere
- **Fix** — Panel resize is now smooth and glitch-free
- **Fix** — Settings About/changelog section layout corrected
- **New** — Metadata editor: refresh button re-reads file tags from disk

### v1.0.3 — 2026-06-16
- **New** — Accent color picker with presets + custom color in Settings
- **New** — Changelog panel in Settings About section
- **Improve** — Metadata editor completely redesigned with two-panel layout

### v1.0.2 — 2026-06-16
- **New** — Audio output device selector in player bar and settings
- **New** — Multi-select songs with Ctrl/Shift+click, batch actions
- **New** — True overlapping crossfade with dual-audio ping-pong engine
- **Fix** — Crossfade settings now persist across launches
- **Fix** — Editing metadata no longer skips to that song

### v1.0.1 — 2026-06-10
- **New** — Queue panel with drag-to-reorder
- **New** — Now Playing panel with lyrics and metadata
- **New** — Crossfade and sleep timer
- **New** — Scan filters (file extensions, min duration, excluded folders)
- **New** — Album art export from metadata editor
- **Fix** — Repeat/loop mode fixed
- **Fix** — Shuffle no longer repeats the same track
- **Improve** — Improved fuzzy search with word-level scoring
- **Improve** — Resizable Now Playing and Queue panels

### v1.0.0 — 2026-06-01
- **New** — Initial release
- **New** — Library management with folder scanning
- **New** — Albums, Artists, Genres browser
- **New** — Playlists with drag-and-drop
- **New** — Metadata editor with lyrics and cover art
- **New** — Dark / light theme
- **New** — Frameless window with custom titlebar
