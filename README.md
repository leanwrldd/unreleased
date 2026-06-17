# unreleased — web

A browser-based music player for the [Juice WRLD API](https://juicewrldapi.com), built with React, Vite, and TypeScript.

> **This is the `web` branch** — API-only, no local library, deployable to any static host.  
> For the full desktop app (Electron + local library), see the [`main` branch](https://github.com/leanwrldd/unreleased/tree/main).

![Version](https://img.shields.io/badge/version-1.1.7-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Vite](https://img.shields.io/badge/Vite-6-646CFF)

---

## Features

- **Categories** — browse Released, Unreleased, Unsurfaced, and Sessions with song counts; drill into Eras
- **Tracker** — search and filter thousands of songs by category, era, and more
- **Radio** — random song playback with skip
- **File browser** — navigate the API filesystem, stream audio, and download files
- **Now Playing panel** — album art, lyrics (fetched from the API), and track info
- **Queue** — add songs, reorder, clear
- **Crossfade, playback speed, sleep timer, accent color, dark/light theme** — all settings persist via localStorage

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

### Deploy

The `dist/` folder is a self-contained static site — deploy it anywhere:

- **Vercel**: `vercel --prod` or connect the repo and set the output dir to `dist`, root to `src/renderer`
- **Netlify**: drag and drop `dist/`, or connect the repo with build command `vite build` and publish dir `dist`
- **GitHub Pages**: push `dist/` to `gh-pages` branch

---

## Credits

- **[juicewrldapi.com](https://juicewrldapi.com)** — the API powering everything: song metadata, streaming, lyrics, eras, categories, and the file browser.
- **juicewrldapi** on Discord — for the help and support building the integration.

---

## Changelog

### v1.1.7 — 2026-06-17
- **Fix** — View mode, sort order, and filters now persist across sessions (localStorage)
- **New** — Eras section in Categories — browse all eras as cards, click to open Tracker filtered by that era
- **New** — Category badges in Tracker are clickable — click to jump to the Categories view
- **New** — "By album" toggle groups songs by era/album with section headers; default off, persists

### v1.1.6 — 2026-06-17
- **Fix** — API track cover art, album, and era info now show correctly in the player bar and Now Playing
- **New** — Lyrics fetched from the API when a song has no embedded lyrics
- **New** — Categories view — browse by release status with song counts
- **New** — Download button on every file in the API Files browser
- **New** — Sort by name, type, or size in the API Files browser

### v1.1.5 — 2026-06-17
- **New** — Image viewer with fullscreen lightbox and filmstrip
- **New** — Video player — play video files inline
- **New** — Grid view for the file browser

### v1.1.4 — 2026-06-17
- **New** — API Files — browse the Juice WRLD API filesystem from the sidebar
- **New** — Play any audio file from the API browser with cover art and a directory queue

### v1.1.3 — 2026-06-17
- **New** — Tracker grid view — toggle between list and card layouts
- **New** — Jump-to-page in Tracker

### v1.1.2 — 2026-06-17
- **New** — Tracker — browse and search thousands of songs with category and era filters
- **New** — Radio — plays a random song; skip to get another
- **New** — Categories view

### v1.0.0 — 2026-06-01
- Initial release
