# unreleased — web

A browser-based music player for Juice WRLD unreleased songs, powered by the [Juice WRLD API](https://juicewrldapi.com).

![Version](https://img.shields.io/badge/version-1.8.1-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Vite](https://img.shields.io/badge/Vite-6-646CFF)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/jwa)

**Live:** [player.juicewrldpapi.com](https://player.juicewrldpapi.com)

---

## Features

- **Tracker** — search, filter by category/era, and sort by any column; collapsible category sidebar with era counts; infinite scroll; right-click context menu on every song
- **Radio mode** — 📻 toggle in the player bar; pre-fetches next random track while current plays; rolling 30-song history; toggling shuffle on a tracker song enters radio mode automatically
- **Queue** — drag-to-reorder, history + upcoming split, lazy-load (50 songs upfront, more as tracks end); radio view shows pre-fetched next track with pulsing indicator
- **Playlists** — Spotify-style hero with 2×2 cover mosaic; custom cover upload; description; drag-to-reorder tracks; share via public link; zip-download all tracks; add all tracks to another playlist; right-click context menu per track
- **Shared playlist view** — anyone with a share link can play the playlist without an account
- **Liked songs** — heart in the player bar, persists across sessions
- **Accounts** — sign in with Discord OAuth; liked songs and playlists sync to the API; editor/admin roles
- **Song info modal** — full metadata: titles, artists, producers, era, engineers, recording details, dates, lyrics preview
- **Now Playing panel** — album art, lyrics fetched from the API, track info
- **Files browser** — navigate the API filesystem, stream audio, download files
- **Compilation** — Studio Albums & Mixtapes, Unreleased, and Singles with album art grids
- **Editor tools** — submit song edits as proposals, track proposal status, leaderboard, badges, admin review panel
- **Appearance** — dark/light theme, custom accent color, audio output picker, crossfade (1–12 s), playback speed (0.5×–2×), sleep timer

---

## Stack

- **React 18** + **TypeScript**
- **Vite 6** — dev server and bundler
- **Zustand** — state management (localStorage-backed)
- **Tailwind CSS** — styling
- **lucide-react** — icons
- Powered by **[juicewrldapi.com](https://juicewrldapi.com)**

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Type-check
npx tsc --noEmit

# Production build → dist/
npm run build

# Preview production build locally
npm run preview
```

---

## Credits

- **[juicewrldapi.com](https://juicewrldapi.com)** — the API powering everything: song metadata, streaming, lyrics, eras, categories, and the file browser.
- **juicewrldapi** on Discord — for the help and support building the integration.
- Built by **freakylatif** — find me on Discord.
- Join the **[Discord](https://discord.gg/jwa)** server

---

## To-dos

- Add "similar songs" feature
- Add CDQ remasters of unsurfaced songs

---

## Changelog

### v1.8.5

- Fix React hooks error in local playlist detail view
- Fix library track metadata and cover art not loading (local files)
- Remove visible border from title bar spacing
- Add ··· context menu button to API playlist cards

## v1.8.4
- Fix: Added visual separation between the title bar and app content
- Fix: Library cover art now updates correctly after lazy-loading
- New: Right-click context menu on library track rows
- New: Context menus on local playlist cards (rename, delete)
- New: Local playlists support custom cover images
- Improve: Metadata editor lyrics redesigned with full-width editor
- Improve: Discord login opens a popup window in the desktop app

### v1.8.3
- **Fix** Window controls overlap in Library toolbar
- **Improve** Local playlists moved exclusively to Playlists tab
- **New** Local playlists visible without login

See [CHANGELOG.md](./CHANGELOG.md) for the full history.
### v1.7.1 - 2026-06-20
- New WRLD view: 999 FM live radio integration — toggle streams live audio with real-time metadata (cover art, title, artist, elapsed/duration)
- New WRLD view: FM seek bar ticks in real time using a local 500 ms timer synced to elapsed_ms from the WebSocket
- New WRLD view: FM mode Radio/Lyrics tab panel — vote to skip, suggest next song, view up-next and queue preview
- New WRLD view: FM song lookup — matches now-playing title to API song for cover art and lyrics display
- Fix WRLD view: seek bar no longer goes gray in FM mode (removed disabled attribute that triggered browser-native styling)
- Improve WRLD view: fully responsive — stacked layout on mobile (compact art + title header, scrollable content below), side-by-side on desktop unchanged

### v1.5.9 — 2026-06-20
- **Fix** Playlists: description edit trigger was invisible; now shows at 40% opacity and brightens on hover
- **Improve** Playlists: pencil icon on cover hover to indicate editability
- **Fix** Shared playlists: rewrote track parser — handles all API response shapes; shared pages no longer show empty

### v1.5.8 — 2026-06-20
- **New** Playlists: upload a custom cover image (click the cover to open file picker)
- **New** Playlists: add and edit a description inline (Enter saves, Escape cancels)
- **New** Playlists: remove cover image to reset to auto mosaic

### v1.5.7 — 2026-06-20
- **New** Queue: radio mode view shows pre-fetched next track instead of empty queue
- **New** Player: 3-dot menu adds "Play Next" and "Song info"
- **Improve** Player: heart + 3-dot buttons are inline with song title, following its natural width
- **Improve** Queue: enabling shuffle while a tracker song plays starts radio mode
- **Fix** Player: repeat-one restarts audio directly without resetting song info

### v1.5.4 — 2026-06-20
- **New** Playlists: right-click context menu per track (Play, Queue, Song Info, Add to Playlist, Remove, Download)
- **New** Playlists: drag-to-reorder tracks
- **New** Playlists: zip-download all tracks, share via public link, add all to another playlist
- **New** Shared playlist view — read-only playback for anyone with the link

### v1.5.3 — 2026-06-19
- **New** Playlist page: Spotify-style hero with 2×2 cover mosaic, gradient, Play + Shuffle buttons
- **New** Player: gapless next-song preload via dual-audio slot

### v1.5.2 — 2026-06-19
- **Fix** Tracker: songs show on initial load; infinite scroll accumulates correctly
- **Fix** Queue: shuffle excludes unsurfaced tracks; lazy-loads when filters are active
- **New** Queue: "Random mode" label when playing with no filters

### v1.5.0 — 2026-06-19
- **New** Tracker: infinite scroll — no more page buttons
- **New** Right-click context menu on every song
- **New** Sidebar: collapsible to icon-only strip

### v1.4.0 — 2026-06-18
- **Fix** Repeat-one: track info no longer disappears on replay
- **Fix** Files/Compilation: cover art and artist show reliably

### v1.3.9 — 2026-06-18
- **New** Radio mode toggle in player bar
- **New** Tracker: click column headers to sort
- **Fix** Player bar and Now Playing: info correct for Files/Compilation tracks

### v1.3.8 — 2026-06-18
- **New** Site favicon; collapsible category sidebar with era counts
- **Fix** Radio: full ~14-song queue built upfront

### v1.3.7 — 2026-06-17
- **New** Contribute: lyrics fields, pre-filled additional info, category dropdown
