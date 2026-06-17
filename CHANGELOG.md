# Changelog

All notable changes to this project are documented here.

> Deployed on [Vercel](https://unreleased-juicewrldapi.vercel.app) · Source on [GitHub](https://github.com/leanwrldd/unreleased)

---

## [1.2.5] — 2026-06-17

- **Improve** Tracker: clicking a category badge now filters by that category in place instead of navigating to the Categories view
- **Improve** Code cleanup and dead code removal in preparation for next release

---

## [1.2.4] — 2026-06-17

- **Fix** Mobile bottom nav labels now visible — inactive tab text was inheriting no color (appeared black on dark sidebar)
- **Improve** Mobile nav icons slightly larger (24px); sidebar logo bigger (h-32)

---

## [1.2.3] — 2026-06-17

- **Fix** Mobile bottom nav labels no longer hidden on small screens — text truncates cleanly instead of overflowing
- **Improve** Changelog removed from Settings — cleaner About section

---

## [1.2.2] — 2026-06-17

- **Fix** Mobile bottom nav no longer hidden by the browser address bar — uses dynamic viewport height and safe-area insets
- **Improve** Logo is larger in the sidebar

---

## [1.2.1] — 2026-06-17

- **Improve** Files: play audio by clicking the cover art or double-clicking the row — standalone play button removed
- **New** Files: info button on audio files — searches the Tracker for that song and jumps straight to it

---

## [1.2.0] — 2026-06-17

- **New** Deep URL routing for Files — navigating into a folder updates the URL to /files/FolderName/SubFolder; paste or refresh any folder URL to land directly in it
- **New** Copy link button on every file and folder — chain icon copies the direct stream URL (files) or shareable app URL (folders)
- **New** URL-based view routing — the address bar now shows /categories, /tracker, /radio, or /files as you navigate
- **New** GitHub link added to the sidebar (desktop) and Settings About section (mobile)

---

## [1.1.7] — 2026-06-17

- **Fix** View mode (list/grid), sort order, column visibility, and scan filters now persist across restarts
- **New** Eras section in the Categories view — browse all eras as cards, click any to open the Tracker filtered by that era
- **New** Category badges in the Tracker are now clickable — click to jump to the Categories view
- **New** "By album" toggle in Tracker and Categories — groups songs by era/album with section headers; default off, persists across sessions

---

## [1.1.6] — 2026-06-17

- **Fix** API track cover art, album, and era info now show up correctly in the player bar and Now Playing panel
- **Fix** App now opens directly on the Tracker when API mode was last active — no more landing on the local library
- **New** Lyrics fetched from the API when streaming a song that has no embedded lyrics
- **New** Categories view in API mode — browse Released, Unreleased, Unsurfaced, and Sessions with song counts, click to open the Tracker pre-filtered
- **New** Download button on every file in the API Files browser — saves to the Downloads folder (or a custom folder set in Settings)
- **New** Sort by name, type, or size in the API Files browser — sort settings persist across sessions

---

## [1.1.5] — 2026-06-17

- **New** Image viewer — click any image in the file browser to open a fullscreen lightbox with arrow-key navigation and a filmstrip
- **New** Video player — click any video file to play it inline in the app, with a fallback download link for unsupported formats
- **New** Grid view for both file browsers (local and API) — toggle between list and card grid with thumbnails
- **Improve** Local file browser now shows images and videos alongside audio files (not just audio)

---

## [1.1.4] — 2026-06-17

- **New** API Files — browse the Juice WRLD API filesystem directly from the sidebar in API mode
- **New** Play any audio file from the API browser with cover art and a full directory queue

---

## [1.1.3] — 2026-06-17

- **New** File browser — navigate your local filesystem and play audio files directly
- **New** Tracker grid view — toggle between list and card grid layout with the view switcher
- **New** Jump-to-page in Tracker — click the page number and type any page to jump instantly
- **Improve** Error boundary now shows full crash details, stack trace, copy button, and saves a crash log to disk
- **Improve** Local playlists hidden in API mode for a cleaner sidebar
- **Fix** Edit song button hidden in API mode (editing API tracks is not supported)
- **Fix** Windows taskbar icon now correct size (multi-resolution .ico)
- **Fix** Volume slider now vertically centered in the player bar

---

## [1.1.2] — 2026-06-17

- **New** Local / API mode toggle in sidebar — switch between your local library and the Juice WRLD API
- **New** Tracker — browse and search thousands of songs from the API with category and era filters
- **New** Radio — plays a random song from the API; skip to get another

---

## [1.1.1] — 2026-06-17

- **New** Playlists page is now sortable — sort by Name, Date added, or Custom order
- **New** Provider status dots now ping the URL and turn green (online) or red (offline)

---

## [1.1.0] — 2026-06-17

- **New** Providers section in Settings — add URLs for external services, with a status indicator light per provider (live status checks coming soon)

---

## [1.0.9] — 2026-06-16

- **New** Playlists page — click Playlists in the sidebar to see all playlists as a cover art grid
- **New** Synced lyrics tab in Lyrics view (editor coming soon)
- **Improve** Lyrics view: song list now shows cover art thumbnails and tighter layout
- **Improve** App name "unreleased" now has letter spacing for a cleaner look
- **Fix** Pen icon in Now Playing panel now correctly opens the metadata editor

---

## [1.0.8] — 2026-06-16

- **New** Lyrics browser — browse all songs' lyrics and full-text search across your library
- **New** Albums list view — toggle between grid and list, with customizable columns
- **New** Playlist large list view — see cover art thumbnails next to playlist names in the sidebar
- **Fix** Clicking artist name in the player bar now navigates to their artist page
- **Fix** Version saved in About now persists across app restarts
- **Improve** Scan Filters section in Settings is now collapsible

---

## [1.0.7] — 2026-06-16

- **New** Liked Songs — heart button in player bar, Liked Songs page in sidebar, persists across restarts
- **New** Metadata editor shows bitrate, sample rate, bit depth, channels, and file size
- **New** Clicking genre text in song rows navigates to that genre's page
- **New** Sort by Genre column now works
- **Fix** Editing another song's metadata no longer changes the currently playing song's album cover
- **Fix** Artist and album clickable area no longer spans the full column width
- **Fix** Creating folders inside folders now works inline — no more broken prompt dialog
- **Improve** Genre card colors are now vivid and correct in both light and dark mode

---

## [1.0.6] — 2026-06-16

- **New** Nested playlist folders — folders within folders (inception mode)
- **New** Playback speed control (0.5×–2×) in player bar, persists across restarts
- **New** Genre right-click context menu — Play, Add to queue, Add to playlist
- **Fix** Seek bar no longer makes noise while scrubbing — audio only seeks on mouse release
- **Fix** Left-click now selects songs; right-click is purely for the context menu
- **Fix** Metadata editor opens correctly again
- **Improve** Folder rows are now larger and bolder than playlist rows in the sidebar
- **Improve** Genre card colors are now readable in light mode

---

## [1.0.5] — 2026-06-16

- **New** Playlist folders — group playlists into collapsible folders
- **New** Pin playlists to the top of the sidebar
- **New** Sort playlists by name, date added, or custom order
- **New** Add entire playlist to queue from sidebar context menu
- **New** Lyrics view in sidebar (coming soon)
- **Improve** Multi-select now only activates via Ctrl+click or Select button
- **Improve** Multi-select works in album/artist/genre drill-down views
- **Improve** Cover art loading optimized — faster queue scrolling, no shimmer in queue

---

## [1.0.4] — 2026-06-16

- **Fix** Accent color now applies everywhere (Tailwind opacity variants fixed)
- **Fix** Panel resize is now smooth and glitch-free
- **Fix** Settings About/changelog section layout corrected
- **New** Metadata editor: refresh button re-reads file tags from disk

---

## [1.0.3] — 2026-06-16

- **New** Accent color picker with presets + custom color in Settings
- **New** Dev-only version editor in Settings About section
- **New** Changelog panel in Settings About section
- **Improve** Metadata editor completely redesigned with two-panel layout
- **Improve** Removed duplicate dark/light theme buttons from Settings
- **Fix** Progress bar now respects accent color

---

## [1.0.2] — 2026-06-16

- **New** Audio output device selector in player bar and settings
- **New** Multi-select songs with Ctrl/Shift+click, batch actions
- **New** True overlapping crossfade with dual-audio ping-pong engine
- **Fix** Crossfade toggle animation now works correctly
- **Fix** Crossfade settings now persist across launches
- **Fix** Editing metadata no longer skips to that song
- **Improve** Album song list column spacing improved
- **Improve** Sidebar logo enlarged, window control icons smaller

---

## [1.0.1] — 2026-06-10

- **New** Queue panel with drag-to-reorder
- **New** Now Playing panel with lyrics and metadata
- **New** Crossfade and sleep timer
- **New** Scan filters (file extensions, min duration, excluded folders)
- **New** Album art export from metadata editor
- **Fix** Repeat/loop mode fixed
- **Fix** Shuffle no longer repeats the same track
- **Improve** Improved fuzzy search with word-level scoring
- **Improve** Resizable Now Playing and Queue panels

---

## [1.0.0] — 2026-06-01

- **New** Initial release
- **New** Library management with folder scanning
- **New** Albums, Artists, Genres browser
- **New** Playlists with drag-and-drop
- **New** Metadata editor with lyrics and cover art
- **New** Dark / light theme
- **New** Frameless window with custom titlebar
