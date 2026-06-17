export interface ChangelogEntry {
  version: string
  date: string
  changes: { type: 'new' | 'fix' | 'improve'; text: string }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.4.0',
    date: '2026-06-18',
    changes: [
      { type: 'fix', text: 'Radio feature removed — radio tab and toggle button no longer appear; radio-related code fully cleaned up' },
      { type: 'fix', text: 'When a song replays on repeat-one, track info (title, artist, cover art) no longer disappears' },
      { type: 'fix', text: 'Playing from Files or Compilation: artist and cover art now show reliably; broken cover art falls back to music note icon instead of a blank square' },
      { type: 'fix', text: 'Tracker: track names no longer disappear when the Now Playing panel opens alongside the song list' },
    ]
  },
  {
    version: '1.3.9',
    date: '2026-06-18',
    changes: [
      { type: 'new', text: 'Radio mode: removed dedicated radio tab — radio is now a toggle button (📻) in the player bar; when on, a fresh random queue loads automatically when the current queue ends' },
      { type: 'new', text: 'Tracker: click any column header (Title, Artist, Era, Category, Time) to sort; click again to reverse — powered by the API\'s ordering parameter' },
      { type: 'fix', text: 'Tracker: removed era dropdown and "By album" toggle — era filter now lives in the category sidebar' },
      { type: 'fix', text: 'Player bar and Now Playing: track info (title, artist, cover art) now shows correctly when playing from Files or Compilation' },
      { type: 'fix', text: 'Now Playing: title and artist always visible when artwork is collapsed, even for tracks without cover art' },
      { type: 'fix', text: 'Queue panel: songs with unknown duration now show --:-- instead of 0:00' },
      { type: 'fix', text: 'Favicon: icon resized and auto-cropped — no longer appears tiny in browser tabs' },
      { type: 'improve', text: 'App name wordmark: slightly heavier font weight for better legibility' },
      { type: 'improve', text: 'Audio output picker: re-enumerates devices when playback starts — should surface all available output devices with labels' },
    ]
  },
  {
    version: '1.3.8',
    date: '2026-06-18',
    changes: [
      { type: 'new', text: 'Site favicon — browser tabs now show the unreleased logo instead of a generic file icon' },
      { type: 'new', text: 'Tracker: collapsible category sidebar (desktop) with category counts and era list — replaces separate Categories view' },
      { type: 'new', text: 'All song lists now have consistent action buttons — Info, Add to Queue, and Download across Tracker, Compilation, Radio, and Files views' },
      { type: 'new', text: 'Add to Queue button added to all playable song rows (tracker, compilation, radio, files)' },
      { type: 'fix', text: 'Radio: now builds a full queue of ~14 random songs upfront instead of stopping after 2 — pressing skip fetches a new queue' },
      { type: 'fix', text: 'Now Playing: cover art and track info now show correctly when playing from compilation or file-based sources' },
      { type: 'fix', text: 'Settings: "Become an Editor" button is now hidden for users who are already editors or admins' },
      { type: 'improve', text: 'Sidebar and bottom nav: removed Categories (now inside Tracker) and Contribute (use the pencil icon in Now Playing) entries' },
    ]
  },
  {
    version: '1.3.7',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'Contribute: date fields (release date, recording date) cleaned — API-prepended words like "Recorded" are stripped automatically' },
      { type: 'improve', text: 'Contribute: Category is now a dropdown (Released / Unreleased / Unsurfaced / Recording Session)' },
      { type: 'new', text: 'Contribute: "Additional information" from API is now pre-filled into the Context/Story field' },
      { type: 'new', text: 'Contribute: Lyrics and Synced Lyrics fields added — lyrics pre-filled from API if available, synced lyrics (LRC format) for editor entry' },
    ]
  },
  {
    version: '1.3.6',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'Radio: unsurfaced songs also excluded — only released and unreleased songs play (unsurfaced have no audio files)' },
      { type: 'new', text: 'Contribute: Album field added — editor-entered only, not pulled from the API' },
    ]
  },
  {
    version: '1.3.5',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'Radio: session recording files are now skipped — only released, unreleased, and unsurfaced songs play' },
      { type: 'improve', text: 'Now Playing: removed Info tab — replaced with an ⓘ button in the header that opens the full song info modal (same as in the Tracker)' },
    ]
  },
  {
    version: '1.3.4',
    date: '2026-06-17',
    changes: [
      { type: 'improve', text: 'Contribute page: all fields pre-filled from API data when a song is selected — edit to correct/override' },
      { type: 'new', text: 'Contribute page: new correction fields — title, artist, era, category, leak type' },
      { type: 'new', text: 'Contribute page: existing saved edits load automatically when you re-select a song' },
      { type: 'improve', text: 'Contribute page: removed "Your name" field — attribution is automatic from your account' },
    ]
  },
  {
    version: '1.3.3',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Editors and admins see a pencil icon in Now Playing — clicking it navigates to the Contribute page with that song pre-selected' },
    ]
  },
  {
    version: '1.3.2',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Contribute tab added to sidebar and bottom nav — replaces the hidden Editor route' },
      { type: 'new', text: 'Delete account option in Contribute page header (for logged-in users) and Admin → Account tab' },
      { type: 'improve', text: 'Log out moved to Contribute page header for logged-in users' },
      { type: 'improve', text: 'Lyrics source attribution moved next to the filename as subtle gray text, no longer a separate info row' },
      { type: 'improve', text: 'Sign-in prompt on Contribute page no longer uses "become an editor" language' },
    ]
  },
  {
    version: '1.3.1',
    date: '2026-06-17',
    changes: [
      { type: 'improve', text: 'Categories: removed "By album" sort toggle — eras now always display in their default order' },
      { type: 'new', text: 'Now Playing info tab: shows lyrics source (juicewrldapi.com or Local file) and whether they are synced' },
    ]
  },
  {
    version: '1.3.0',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Account system — sign up and request editor access, admins approve/reject requests' },
      { type: 'new', text: 'Admin dashboard at /admin — manage pending approvals, editors, recent submissions, and stats' },
      { type: 'new', text: 'Editor page now gated behind auth — sign in to edit, pending approval message for unapproved accounts' },
      { type: 'new', text: 'Admin and Editor role badges shown in the Editor header' },
      { type: 'new', text: 'Admin link appears in Sidebar and BottomNav for admin users only' },
      { type: 'improve', text: 'Editor page save now only enabled for users with editor or admin role (enforced on both frontend and database via RLS)' },
    ]
  },
  {
    version: '1.2.9',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'Compilation: album covers now load correctly — lazily browses into each folder to find the first audio file' },
      { type: 'fix', text: 'Compilation: Singles and Unreleased tabs fall back to the Tracker API when no matching folder is found' },
      { type: 'new', text: 'Compilation: Studio Albums & Mixtapes tab now shows two labeled sections' },
      { type: 'new', text: 'Supabase database — supplemental song data (context, samples, trivia, links, verified corrections, quality rating)' },
      { type: 'new', text: 'Editor page — search for any song and submit supplemental data directly to the database' },
      { type: 'improve', text: 'Song info modal now shows Supabase data (context, samples, trivia, links, editor notes) when available' },
    ]
  },
  {
    version: '1.2.8',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Compilation tab — browse released discography, unreleased, and singles with album grid and track file list views' },
      { type: 'fix', text: 'Song info modal: duration no longer duplicated, empty fields hidden, unsurfaced songs without files have no play button' },
      { type: 'improve', text: 'Song info modal UI overhaul — blurred hero backdrop with cover art, clean label/value rows, and grouped sections' },
    ]
  },
  {
    version: '1.2.7',
    date: '2026-06-17',
    changes: [
      { type: 'improve', text: 'Song info modal now shows all available API data — engineers, recording locations, recording dates, file names, instrumentals, additional info, important dates, session info, notes, and bitrate in collapsible sections' },
    ]
  },
  {
    version: '1.2.6',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Song info modal — click ℹ on any song in the Tracker (or double-click the row) to see all details: titles, alt names, artists, producers, era, category, duration, leak type, date, and lyrics' },
      { type: 'new', text: 'Files info button now opens the song info modal instead of jumping to the Tracker' },
      { type: 'new', text: 'Become an Editor page — accessible from Settings (placeholder for now)' },
      { type: 'improve', text: '"unreleased" wordmark redesigned — thin Josefin Sans, wide letter-spacing' },
    ]
  },
  {
    version: '1.2.5',
    date: '2026-06-17',
    changes: [
      { type: 'improve', text: 'Tracker: clicking a category badge now filters by that category in place instead of navigating to the Categories view' },
      { type: 'improve', text: 'Code cleanup and dead code removal in preparation for next release' },
    ]
  },
  {
    version: '1.2.4',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'Mobile bottom nav labels now visible — inactive tab text was inheriting no color (appeared black on dark sidebar)' },
      { type: 'improve', text: 'Mobile nav icons slightly larger (24px); sidebar logo bigger (h-32)' },
    ]
  },
  {
    version: '1.2.3',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'Mobile bottom nav labels no longer hidden on small screens — text truncates cleanly instead of overflowing' },
      { type: 'improve', text: 'Changelog removed from Settings — cleaner About section' },
    ]
  },
  {
    version: '1.2.2',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'Mobile bottom nav no longer hidden by the browser address bar — uses dynamic viewport height and safe-area insets' },
      { type: 'improve', text: 'Logo is larger in the sidebar' },
    ]
  },
  {
    version: '1.2.1',
    date: '2026-06-17',
    changes: [
      { type: 'improve', text: 'Files: play audio by clicking the cover art or double-clicking the row — standalone play button removed' },
      { type: 'new', text: 'Files: info button on audio files — searches the Tracker for that song and jumps straight to it' },
    ]
  },
  {
    version: '1.2.0',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Deep URL routing for Files — navigating into a folder updates the URL to /files/FolderName/SubFolder; paste or refresh any folder URL to land directly in it' },
      { type: 'new', text: 'Copy link button on every file and folder — chain icon copies the direct stream URL (files) or shareable app URL (folders)' },
      { type: 'new', text: 'URL-based view routing — the address bar now shows /categories, /tracker, /radio, or /files as you navigate' },
      { type: 'new', text: 'GitHub link added to the sidebar (desktop) and Settings About section (mobile)' },
    ]
  },
  {
    version: '1.1.7',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'View mode (list/grid), sort order, column visibility, and scan filters now persist across restarts' },
      { type: 'new', text: 'Eras section in the Categories view — browse all eras as cards, click any to open the Tracker filtered by that era' },
      { type: 'new', text: 'Category badges in the Tracker are now clickable — click to jump to the Categories view' },
      { type: 'new', text: '"By album" toggle in Tracker and Categories — groups songs by era/album with section headers; default off, persists across sessions' },
    ]
  },
  {
    version: '1.1.6',
    date: '2026-06-17',
    changes: [
      { type: 'fix', text: 'API track cover art, album, and era info now show up correctly in the player bar and Now Playing panel' },
      { type: 'fix', text: 'App now opens directly on the Tracker when API mode was last active — no more landing on the local library' },
      { type: 'new', text: 'Lyrics fetched from the API when streaming a song that has no embedded lyrics' },
      { type: 'new', text: 'Categories view in API mode — browse Released, Unreleased, Unsurfaced, and Sessions with song counts, click to open the Tracker pre-filtered' },
      { type: 'new', text: 'Download button on every file in the API Files browser — saves to the Downloads folder (or a custom folder set in Settings)' },
      { type: 'new', text: 'Sort by name, type, or size in the API Files browser — sort settings persist across sessions' },
    ]
  },
  {
    version: '1.1.5',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Image viewer — click any image in the file browser to open a fullscreen lightbox with arrow-key navigation and a filmstrip' },
      { type: 'new', text: 'Video player — click any video file to play it inline in the app, with a fallback download link for unsupported formats' },
      { type: 'new', text: 'Grid view for both file browsers (local and API) — toggle between list and card grid with thumbnails' },
      { type: 'improve', text: 'Local file browser now shows images and videos alongside audio files (not just audio)' },
    ]
  },
  {
    version: '1.1.4',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'API Files — browse the Juice WRLD API filesystem directly from the sidebar in API mode' },
      { type: 'new', text: 'Play any audio file from the API browser with cover art and a full directory queue' },
    ]
  },
  {
    version: '1.1.3',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'File browser — navigate your local filesystem and play audio files directly' },
      { type: 'new', text: 'Tracker grid view — toggle between list and card grid layout with the view switcher' },
      { type: 'new', text: 'Jump-to-page in Tracker — click the page number and type any page to jump instantly' },
      { type: 'improve', text: 'Error boundary now shows full crash details, stack trace, copy button, and saves a crash log to disk' },
      { type: 'improve', text: 'Local playlists hidden in API mode for a cleaner sidebar' },
      { type: 'fix', text: 'Edit song button hidden in API mode (editing API tracks is not supported)' },
      { type: 'fix', text: 'Windows taskbar icon now correct size (multi-resolution .ico)' },
      { type: 'fix', text: 'Volume slider now vertically centered in the player bar' },
    ]
  },
  {
    version: '1.1.2',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Local / API mode toggle in sidebar — switch between your local library and the Juice WRLD API' },
      { type: 'new', text: 'Tracker — browse and search thousands of songs from the API with category and era filters' },
      { type: 'new', text: 'Radio — plays a random song from the API; skip to get another' },
    ]
  },
  {
    version: '1.1.1',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Playlists page is now sortable — sort by Name, Date added, or Custom order' },
      { type: 'new', text: 'Provider status dots now ping the URL and turn green (online) or red (offline)' },
    ]
  },
  {
    version: '1.1.0',
    date: '2026-06-17',
    changes: [
      { type: 'new', text: 'Providers section in Settings — add URLs for external services, with a status indicator light per provider (live status checks coming soon)' },
    ]
  },
  {
    version: '1.0.9',
    date: '2026-06-16',
    changes: [
      { type: 'new', text: 'Playlists page — click Playlists in the sidebar to see all playlists as a cover art grid' },
      { type: 'new', text: 'Synced lyrics tab in Lyrics view (editor coming soon)' },
      { type: 'improve', text: 'Lyrics view: song list now shows cover art thumbnails and tighter layout' },
      { type: 'improve', text: 'App name "unreleased" now has letter spacing for a cleaner look' },
      { type: 'fix', text: 'Pen icon in Now Playing panel now correctly opens the metadata editor' },
    ]
  },
  {
    version: '1.0.8',
    date: '2026-06-16',
    changes: [
      { type: 'new', text: 'Lyrics browser — browse all songs\' lyrics and full-text search across your library' },
      { type: 'new', text: 'Albums list view — toggle between grid and list, with customizable columns' },
      { type: 'new', text: 'Playlist large list view — see cover art thumbnails next to playlist names in the sidebar' },
      { type: 'fix', text: 'Clicking artist name in the player bar now navigates to their artist page' },
      { type: 'fix', text: 'Version saved in About now persists across app restarts' },
      { type: 'improve', text: 'Scan Filters section in Settings is now collapsible' },
    ]
  },
  {
    version: '1.0.7',
    date: '2026-06-16',
    changes: [
      { type: 'new', text: 'Liked Songs — heart button in player bar, Liked Songs page in sidebar, persists across restarts' },
      { type: 'new', text: 'Metadata editor shows bitrate, sample rate, bit depth, channels, and file size' },
      { type: 'new', text: 'Clicking genre text in song rows navigates to that genre\'s page' },
      { type: 'new', text: 'Sort by Genre column now works' },
      { type: 'fix', text: 'Editing another song\'s metadata no longer changes the currently playing song\'s album cover' },
      { type: 'fix', text: 'Artist and album clickable area no longer spans the full column width' },
      { type: 'fix', text: 'Creating folders inside folders now works inline — no more broken prompt dialog' },
      { type: 'improve', text: 'Genre card colors are now vivid and correct in both light and dark mode' },
    ]
  },
  {
    version: '1.0.6',
    date: '2026-06-16',
    changes: [
      { type: 'new', text: 'Nested playlist folders — folders within folders (inception mode)' },
      { type: 'new', text: 'Playback speed control (0.5×–2×) in player bar, persists across restarts' },
      { type: 'new', text: 'Genre right-click context menu — Play, Add to queue, Add to playlist' },
      { type: 'fix', text: 'Seek bar no longer makes noise while scrubbing — audio only seeks on mouse release' },
      { type: 'fix', text: 'Left-click now selects songs; right-click is purely for the context menu' },
      { type: 'fix', text: 'Metadata editor opens correctly again' },
      { type: 'improve', text: 'Folder rows are now larger and bolder than playlist rows in the sidebar' },
      { type: 'improve', text: 'Genre card colors are now readable in light mode' },
    ]
  },
  {
    version: '1.0.5',
    date: '2026-06-16',
    changes: [
      { type: 'new', text: 'Playlist folders — group playlists into collapsible folders' },
      { type: 'new', text: 'Pin playlists to the top of the sidebar' },
      { type: 'new', text: 'Sort playlists by name, date added, or custom order' },
      { type: 'new', text: 'Add entire playlist to queue from sidebar context menu' },
      { type: 'new', text: 'Lyrics view in sidebar (coming soon)' },
      { type: 'improve', text: 'Multi-select now only activates via Ctrl+click or Select button' },
      { type: 'improve', text: 'Multi-select works in album/artist/genre drill-down views' },
      { type: 'improve', text: 'Cover art loading optimized — faster queue scrolling, no shimmer in queue' },
    ]
  },
  {
    version: '1.0.4',
    date: '2026-06-16',
    changes: [
      { type: 'fix', text: 'Accent color now applies everywhere (Tailwind opacity variants fixed)' },
      { type: 'fix', text: 'Panel resize is now smooth and glitch-free' },
      { type: 'fix', text: 'Settings About/changelog section layout corrected' },
      { type: 'new', text: 'Metadata editor: refresh button re-reads file tags from disk' },
    ]
  },
  {
    version: '1.0.3',
    date: '2026-06-16',
    changes: [
      { type: 'new', text: 'Accent color picker with presets + custom color in Settings' },
      { type: 'new', text: 'Dev-only version editor in Settings About section' },
      { type: 'new', text: 'Changelog panel in Settings About section' },
      { type: 'improve', text: 'Metadata editor completely redesigned with two-panel layout' },
      { type: 'improve', text: 'Removed duplicate dark/light theme buttons from Settings' },
      { type: 'fix', text: 'Progress bar now respects accent color' },
    ]
  },
  {
    version: '1.0.2',
    date: '2026-06-16',
    changes: [
      { type: 'new', text: 'Audio output device selector in player bar and settings' },
      { type: 'new', text: 'Multi-select songs with Ctrl/Shift+click, batch actions' },
      { type: 'new', text: 'True overlapping crossfade with dual-audio ping-pong engine' },
      { type: 'fix', text: 'Crossfade toggle animation now works correctly' },
      { type: 'fix', text: 'Crossfade settings now persist across launches' },
      { type: 'fix', text: 'Editing metadata no longer skips to that song' },
      { type: 'improve', text: 'Album song list column spacing improved' },
      { type: 'improve', text: 'Sidebar logo enlarged, window control icons smaller' },
    ]
  },
  {
    version: '1.0.1',
    date: '2026-06-10',
    changes: [
      { type: 'new', text: 'Queue panel with drag-to-reorder' },
      { type: 'new', text: 'Now Playing panel with lyrics and metadata' },
      { type: 'new', text: 'Crossfade and sleep timer' },
      { type: 'new', text: 'Scan filters (file extensions, min duration, excluded folders)' },
      { type: 'new', text: 'Album art export from metadata editor' },
      { type: 'fix', text: 'Repeat/loop mode fixed' },
      { type: 'fix', text: 'Shuffle no longer repeats the same track' },
      { type: 'improve', text: 'Improved fuzzy search with word-level scoring' },
      { type: 'improve', text: 'Resizable Now Playing and Queue panels' },
    ]
  },
  {
    version: '1.0.0',
    date: '2026-06-01',
    changes: [
      { type: 'new', text: 'Initial release' },
      { type: 'new', text: 'Library management with folder scanning' },
      { type: 'new', text: 'Albums, Artists, Genres browser' },
      { type: 'new', text: 'Playlists with drag-and-drop' },
      { type: 'new', text: 'Metadata editor with lyrics and cover art' },
      { type: 'new', text: 'Dark / light theme' },
      { type: 'new', text: 'Frameless window with custom titlebar' },
    ]
  },
]