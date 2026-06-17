export interface ChangelogEntry {
  version: string
  date: string
  changes: { type: 'new' | 'fix' | 'improve'; text: string }[]
}

export const CHANGELOG: ChangelogEntry[] = [
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
      { typ