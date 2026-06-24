export interface ChangelogEntry {
  version: string
  date: string
  changes: { type: 'new' | 'fix' | 'improve'; text: string }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.8.7',
    date: '2026-06-25',
    changes: [
      { type: 'fix',     text: 'Fixed window close/minimize/maximize buttons not responding' },
      { type: 'fix',     text: 'Cover art now loads in local playlist rows and player without opening Library first' },
      { type: 'fix',     text: 'Synced lyrics now display in the player for local files' },
      { type: 'new',     text: 'Local playlist context menu: Play all, Shuffle, Add all to queue, Add all to playlist' },
      { type: 'new',     text: 'Sortable columns in Library songs view (click Title, Album, or Duration header)' },
      { type: 'improve', text: 'Removed lyrics toggle button from library track rows' },
      { type: 'improve', text: 'Synced lyrics visible by default in the metadata editor' },
    ],
  },
  {
    version: '1.8.6',
    date: '2026-06-24',
    changes: [
      { type: 'fix',     text: 'Fixed black screen / crash when playing local files with cover art' },
      { type: 'fix',     text: 'Library cover art now loads and updates correctly for all albums' },
      { type: 'fix',     text: 'Login loading spinner no longer gets stuck after popup closes' },
      { type: 'fix',     text: 'Playlist context menu (···) now works correctly on hover' },
      { type: 'improve', text: 'Sidebar now extends to the top of the window in the desktop app' },
    ],
  },
  {
    version: '1.8.5',
    date: '2026-06-24',
    changes: [
      { type: 'fix',     text: 'Fixed React hooks error (#310) in local playlist detail view' },
      { type: 'fix',     text: 'Library track cover art now loads correctly for local files' },
      { type: 'fix',     text: 'Removed visible border from title bar spacing element' },
      { type: 'new',     text: 'API playlist cards now have a visible ··· context menu button on hover' },
    ],
  },
  {
    version: '1.8.4',
    date: '2026-06-24',
    changes: [
      { type: 'fix',     text: 'Added visual separation between the title bar and app content' },
      { type: 'fix',     text: 'Library cover art now updates correctly after lazy-loading' },
      { type: 'new',     text: 'Right-click context menu on library track rows' },
      { type: 'new',     text: 'Context menus (···) on local playlist cards — rename and delete' },
      { type: 'new',     text: 'Local playlists now support custom cover images (click the cover to change)' },
      { type: 'improve', text: 'Metadata editor lyrics section redesigned with full-width editor and line count' },
      { type: 'improve', text: 'Discord login now opens a proper popup window in the desktop app instead of redirecting' },
    ],
  },
    {
    version: '1.8.3',
    date: '2026-06-24',
    changes: [
      { type: 'fix',     text: 'Window controls no longer overlap Library toolbar buttons' },
      { type: 'improve', text: 'Local playlists removed from Library sidebar — now exclusively in the Playlists tab' },
      { type: 'new',     text: 'Local playlists are visible in the Playlists tab even when not logged in' },
    ],
  },
  {
    version: '1.8.2',
    date: '2026-06-24',
    changes: [
      { type: 'improve', text: 'Local playlists now appear in the Playlists page alongside API playlists, with the same card UI and a Local badge' },
      { type: 'improve', text: 'Metadata editor redesigned to match the editor page style: compact field rows, change highlighting, and section dividers' },
      { type: 'fix', text: 'Library songs now show cover art in the player after art loads' },
      { type: 'new', text: 'Library song rows now have an expandable lyrics panel (reads embedded lyrics from file)' },
      { type: 'fix', text: 'Close/minimize/maximize buttons no longer overlap app toolbar buttons in the Library and Editor views' },
    ],
  },

  {
    version: '1.8.1',
    date: '2026-06-24',
    changes: [
      { type: 'fix', text: 'Tracker context menu no longer blinks when opening a second one' },
      { type: 'fix', text: 'Go-backwards button now correctly restarts current song in radio mode' },
      { type: 'fix', text: 'Clicking a history song in radio mode continues radio playback afterward' },
      { type: 'improve', text: 'Tracker category tags are now color-coded: green (released), blue (unreleased), amber (unsurfaced), purple (sessions)' },
      { type: 'fix', text: 'Play/pause button and spacebar are blocked while tuned in to 999 FM' },
      { type: 'fix', text: 'Add to Playlist menu no longer clips out of bounds when triggered from a corner' },
      { type: 'new', text: 'Spacebar now pauses and resumes playback (ignored when typing in an input)' },
    ],
  },

  {
    version: '1.8.0',
    date: '2026-06-24',
    changes: [
      { type: 'new', text: 'Library tab (desktop) -- scan local folders, browse albums grid or songs list, Apple Music style' },
      { type: 'new', text: 'Metadata editor -- edit title, artist, album, year, track/disc #, composer, genre, lyrics, synced lyrics, and album art; writes tags to MP3 files' },
      { type: 'new', text: 'Local playlists -- create, rename, delete playlists from your library; drag to reorder tracks; no login required' },
      { type: 'improve', text: 'Downloads moved to top-right icon button; collapses to a single arrow icon with active-count badge' },
    ],
  },

  {
    version: '1.7.9',
    date: '2026-06-24',
    changes: [
      { type: 'new', text: 'Browser-style downloads popup -- slides up from the bottom, shows progress, open-in-folder button when done' },
      { type: 'fix', text: 'Local files: images and videos now open in the in-app viewer instead of Windows default app' },
      { type: 'fix', text: 'Local files: audio now builds the playback queue from local folder entries' },
    ],
  },
  {
    version: '1.7.8',
    date: '2026-06-24',
    changes: [
      { type: 'new', text: 'Download manager -- tracks file, zip, and update downloads with progress' },
      { type: 'new', text: 'Local files toggle in Files view (desktop only) -- browse and play files from your computer' },
      { type: 'new', text: 'App settings: download folder, startup view, auto-update, minimize to tray' },
      { type: 'fix', text: "Update status no longer stays stuck on 'checking'" },
      { type: 'new', text: 'Force-update button to reinstall latest release without version check' },
    ],
  },
  {
    version: '1.7.6',
    date: '2026-06-23',
    changes: [
      { type: 'fix', text: 'Accent color picker no longer lags -- debounced CSS variable updates' },
      { type: 'new', text: 'Check for updates button in Settings (desktop app only)' },
      { type: 'improve', text: 'Desktop: frameless window, custom icon, no native menu bar' },
      { type: 'improve', text: 'Removed Return to API button from sidebar and bottom nav' },
    ],
  },
  {
    version: '1.7.5',
    date: '2026-06-23',
    changes: [
      { type: 'improve', text: 'Removed Compilation page' },
      { type: 'improve', text: 'Removed Files tab from mobile bottom nav' },
      { type: 'improve', text: 'Cleaned all Capacitor/mobile files from web branch' },
    ],
  },
  {
    version: '1.7.4',
    date: '2026-06-23',
    changes: [
      { type: 'fix', text: 'Fixed 999 FM song search input losing focus after each keystroke' },
      { type: 'new', text: 'Added dismiss button on active vote card in 999 FM' },
      { type: 'improve', text: 'Skip forward/back buttons disabled while 999 FM is active' },
    ],
  },
  {
    version: '1.7.3',
    date: '2026-06-22',
    changes: [
      { type: 'fix', text: 'Mobile lock screen now shows track title, artist, and cover art via Media Session API; play/pause and skip controls work from the lock screen and notification shade' },
    ],
  },
  {
    version: '1.7.2',
    date: '2026-06-22',
    changes: [
      { type: 'fix', text: 'Mobile lock screen metadata (title, artist, artwork) now populated via Media Session API; lock screen seek bar and playback controls wired up' },
    ],
  },
  {
    version: '1.7.1',
    date: '2026-06-22',
    changes: [
      { type: 'fix', text: '999 FM page and RadioFmView removed — radio-fm route, nav entry, and all related files cleaned up' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-06-22',
    changes: [
      { type: 'new', text: 'WRLD tab redesigned for mobile — stacked layout with cover art, track info, and controls optimised for small screens' },
      { type: 'new', text: 'Playlist notch — hover to expand a slim side panel showing your first 6 playlists; click any to add the current track' },
      { type: 'new', text: 'Synced lyrics windowed view — shows ±2 lines around current; auto-follows playback with a Follow button to re-enable after manual scroll' },
      { type: 'new', text: 'Notch category selector — switch between Released Albums, Mixtapes & Singles, Unreleased, and Playlists from inside the notch panel' },
      { type: 'fix', text: 'Tracker context menu no longer blinks during playback — Zustand selectors narrowed with useShallow to prevent re-renders from currentTime updates' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-06-21',
    changes: [
      { type: 'new', text: 'Editor page redesigned — blurred album art header, two-column field grid, category pill buttons, accent left-border change indicators' },
      { type: 'fix', text: 'Radio mode restored — shuffle now correctly activates radio when playing from the Tracker regardless of sort mode or result count' },
      { type: 'fix', text: 'Crossfade in radio mode no longer repeats the same song — now fades into the pre-fetched next radio track' },
    ],
  },
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
    ],
  },
]
