# Changelog

All notable changes to this project are documented here.

> Deployed on [Vercel](https://unreleased-juicewrldapi.vercel.app) · Source on [GitHub](https://github.com/leanwrldd/unreleased)

---

## [1.8.8] - 2026-06-26

- **New** Context menus: Add to Library option — downloads song for offline/local playback to ~/Music/JuiceWRLD Library/
- **New** Add to Playlist menu: shows a check icon next to playlists that already contain the song
- **New** Player bar: right-click opens the context menu
- **New** Player bar: Edit metadata option for local tracks
- **Fix** Tracker: songs now always display their primary name (song.name) instead of alternative/variant titles
- **Fix** WrldView: synced lyrics now animate in when the active line changes
- **Fix** Local playlists: context menus were invisible due to overflow clipping — fixed with portal rendering

---
## [1.7.3] — 2026-06-22

- **Fix** Mobile lock screen now shows track title, artist, and cover art via Media Session API
- **Fix** Lock screen / notification shade play, pause, and skip controls now work
- **Fix** Lock screen seek bar syncs with playback position
- **Fix** 999 FM mode: lock screen metadata updates to currently playing FM track
- **Bump** Version to 1.7.3

---

## [1.7.2] — 2026-06-22

- **Fix** Media Session API wired up in Player — metadata and action handlers added

---

## [1.7.1] — 2026-06-22

- **Remove** RadioFmView (old dedicated 999 FM page) and radioLibrary.ts — FM controls now live in the WRLD view
- **Remove** 999 FM entry from bottom nav
- **Remove** `/999-fm` URL route and `radio-fm` ViewType

---

## [1.7.0] — 2026-06-22

- **New** WRLD view: 999 FM live radio integration — toggle streams live audio with real-time metadata (cover art, title, artist, elapsed/duration)
- **New** WRLD view: FM seek bar ticks in real time using a local 500 ms timer synced to `elapsed_ms` from the WebSocket
- **New** WRLD view: FM mode Radio/Lyrics tab panel — vote to skip, suggest next song, view up-next and queue preview
- **New** WRLD view: FM song lookup — matches now-playing title to API song for cover art and lyrics display
- **Fix** WRLD view: seek bar no longer goes gray in FM mode (removed `disabled` attribute that triggered browser-native styling)
- **Improve** WRLD view: fully responsive — stacked layout on mobile (compact art + title header, scrollable content below), side-by-side on desktop unchanged

---

## [1.5.9] — 2026-06-20

- **Fix** Playlists: description edit trigger was invisible (opacity-0 button); now shows at 40% opacity and brightens on hover
- **Improve** Playlists: pencil icon appears on cover hover to indicate the image is editable (replaced Camera icon)
- **Fix** Shared playlists: rewrote track parser with `isApiSongLite` type guard — handles plain path arrays, full `ApiSongLite` arrays, `items[].song` pattern, and path-keyed objects; shared pages no longer show empty

---

## [1.5.8] — 2026-06-20

- **New** Playlists: upload a custom cover image — click the cover art to open a file picker; uploaded via multipart/form-data PATCH
- **New** Playlists: add and edit a description — click the area below the title to add one, click again to edit, Enter saves, Escape cancels
- **New** Playlists: remove cover image (resets to auto-generated mosaic)

---

## [1.5.7] — 2026-06-20

- **New** Queue: radio mode view — when radio is active, the upcoming section shows only the pre-fetched next track with a pulsing "Finding next song…" indicator instead of a reorderable list
- **New** Player: 3-dot context menu now includes "Play Next" (queues song immediately after current) and "Song info" (fetches and shows full song detail modal)
- **Improve** Player: heart ♥ and 3-dot ··· buttons are now inline with the song title — they follow the natural text width instead of sitting at a fixed position
- **Improve** Queue: toggling shuffle on while a tracker song (`jw-*`) is already playing now starts radio mode instead of shuffling the queue
- **Fix** Player: repeat-one restarts the current audio element directly — no longer calls `nextTrack()`, so song info stays correct
- **Fix** Tracker: category badge shown on row hover; clicking an era in the sidebar sets the era filter correctly
- **Rename** Settings: "Categories" filter label renamed to "Search Settings"

---

## [1.5.4] — 2026-06-20

- **New** Playlists: right-click any track for a context menu — Play, Add to Queue, Song Info, Add to Playlist, Remove, Download
- **New** Playlists: drag tracks to reorder (replaces up/down arrow buttons)
- **New** Playlists: zip and download all API tracks in a playlist at once
- **New** Playlists: share a playlist via a public link (copy link button in hero)
- **New** Playlists: right-click a playlist card in the library to add all its songs to another playlist
- **New** Playlists: add all songs from the open playlist to another playlist (folder icon in hero)
- **New** Shared playlist view — opening a share link shows a read-only playlist anyone can play

---

## [1.5.3] — 2026-06-19

- **New** Playlist page: full Spotify-style hero — large 2×2 cover mosaic, gradient background, bold name, song count + total duration, Play and Shuffle buttons
- **New** Player: next song preloads into the inactive audio slot while the current track plays — no gap on track change (linear/repeat modes)
- **Improve** Playlist library grid: refined card design with hover effects and better placeholder art

---

## [1.5.2] — 2026-06-19

- **Fix** Tracker: songs show on initial load (debounce was clearing songs 400 ms after mount)
- **Fix** Tracker: infinite scroll accumulates songs correctly as you scroll
- **Fix** Tracker: category sidebar is scrollable so all eras are reachable
- **Fix** Tracker: sorting loads the full library client-side — first click asc, second desc, third clears sort
- **Fix** Queue: shuffle/random mode excludes unsurfaced tracks by default
- **Fix** Tracker: duration column right-aligned with tabular-nums; `--:--` for unknown durations
- **Fix** Tracker: "Add to queue" removed from song row (context menu only)
- **New** Queue: playing with no filters shows a "Random mode" label in the queue panel
- **New** Queue: playing with filters lazy-loads the queue — starts with 50 songs, auto-fetches more as tracks end
- **New** Lyrics: editor-only hint hidden for regular users

---

## [1.5.0] — 2026-06-19

- **New** Tracker: infinite/endless scroll — songs load automatically as you scroll; no page buttons
- **New** Context menu — right-click any song (or tap ···) to: Song info, Add to queue, Add to playlist, Show in Files, Download, Edit (editors/admins only)
- **New** Sidebar: collapsible to icon-only strip — click the chevron at the bottom to collapse/expand; state persists
- **Fix** Search now finds producer names — uses `searchall` API param
- **Fix** Sorting works correctly — column header clicks sort the full dataset via the API
- **Remove** GitHub and Discord links removed from sidebar (still in Settings)

---

## [1.4.0] — 2026-06-18

- **Remove** Radio tab and toggle button removed (re-implemented as radio mode in v1.5.7)
- **Fix** Repeat-one: track info, title, artist, and cover art no longer disappear when a song replays
- **Fix** Files / Compilation: artist and cover art show reliably; broken cover falls back to music note icon
- **Fix** Tracker: track names no longer disappear when the Now Playing panel opens

---

## [1.3.9] — 2026-06-18

- **New** Radio mode: 📻 toggle button in the player bar — when on, a fresh random queue loads when the current queue ends
- **New** Tracker: click any column header to sort (Title, Artist, Era, Category, Time); click again to reverse
- **Fix** Tracker: removed era dropdown and "By album" toggle — era filter lives in the category sidebar
- **Fix** Player bar and Now Playing: track info and cover art show correctly for Files and Compilation tracks
- **Fix** Now Playing: title and artist always visible when artwork is collapsed, even for tracks without cover art
- **Fix** Queue panel: unknown-duration songs show `--:--` instead of `0:00`
- **Fix** Favicon: resized and auto-cropped — no longer tiny in browser tabs
- **Improve** App name wordmark: slightly heavier font weight
- **Improve** Audio output picker: re-enumerates devices with permission prompt on playback start

---

## [1.3.8] — 2026-06-18

- **New** Site favicon — browser tabs now show the unreleased logo
- **New** Tracker: collapsible category sidebar (desktop) with song counts and era list
- **New** All song lists have consistent action buttons — Info, Add to Queue, Download across Tracker, Compilation, Radio, and Files
- **Fix** Radio: builds a full ~14-song random queue upfront; no longer stops after 2 songs
- **Fix** Now Playing: cover art and info show correctly when playing from Compilation or Files
- **Fix** Settings: "Become an Editor" hidden for users who are already editors/admins
- **Improve** Nav: removed Categories (now inside Tracker) and Contribute (pencil icon in Now Playing)

---

## [1.3.7] — 2026-06-17

- **Fix** Contribute: date fields strip API-prepended words like "Recorded"
- **Improve** Contribute: Category is now a dropdown
- **New** Contribute: Additional information pre-filled from API into Context/Story field
- **New** Contribute: Lyrics and Synced Lyrics fields added

---

## [1.2.9] — 2026-06-17

- **Fix** Compilation: album covers now load correctly (lazy per-folder fetch)
- **Fix** Compilation: Singles tab falls back to Tracker API released songs when no folder found
- **Fix** Compilation: Unreleased tab falls back to Tracker API when no folder found
- **New** Compilation: Studio Albums & Mixtapes split into separate labeled sections
- **New** Supabase database — supplemental song data layer for editors

---

## [1.2.8] — 2026-06-17

- **New** Compilation tab — browse Studio Albums & Mixtapes, Unreleased, and Singles with album grid and track file list views
- **Fix** Song info modal: duration no longer duplicated, empty fields hidden, unsurfaced songs without files have no play button
- **Improve** Song info modal UI overhaul — blurred hero backdrop, clean label/value rows, grouped sections

---

## [1.2.7] — 2026-06-17

- **Improve** Song info modal now shows all available API data — engineers, recording locations, recording dates, file names, instrumentals, additional info, important dates, session info, notes, and bitrate — each in a collapsible section

---

## [1.2.6] — 2026-06-17

- **New** Song info modal — click ℹ on any song in the Tracker (or double-click the row) to see all details: titles, alt names, artists, producers, era, category, duration, leak type, date, and lyrics
- **New** Files info button now opens the song info modal instead of jumping to the Tracker
- **New** Become an Editor page — accessible from Settings (placeholder for now)
- **Improve** "unreleased" wordmark redesigned — thin Josefin Sans, wide letter-spacing

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
