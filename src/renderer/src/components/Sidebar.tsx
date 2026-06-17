import { useState, useMemo } from 'react'
import {
  Music2,
  ListMusic,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Disc3,
  Users,
  Tag,
  ChevronRight,
  Pin,
  PinOff,
  FolderPlus,
  Folder,
  FolderOpen,
  ArrowUpDown,
  ListOrdered,
  Mic2,
  ListPlus,
  Heart,
  LayoutList,
  LayoutGrid,
  Radio,
  SearchCode,
  HardDrive,
  LayoutDashboard,
} from 'lucide-react'
import logo from '../assets/logo.png'
import { useStore } from '../store/useStore'
import { Playlist, PlaylistFolder, Track } from '../types'
import { AlbumArtThumbnail } from './AlbumArtThumbnail'

type PlaylistSort = 'name' | 'date' | 'manual'

function sortPlaylists(playlists: Playlist[], sort: PlaylistSort): Playlist[] {
  if (sort === 'name') return [...playlists].sort((a, b) => a.name.localeCompare(b.name))
  if (sort === 'date') return [...playlists].sort((a, b) => b.createdAt - a.createdAt)
  return playlists
}

export default function Sidebar(): JSX.Element {
  const {
    activeView,
    activePlaylistId,
    playlists,
    playlistFolders,
    playlistSort,
    library,
    setActiveView,
    setActivePlaylistId,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addTracksToPlaylist,
    togglePlaylistPin,
    movePlaylistToFolder,
    setPlaylistSort,
    addPlaylistToQueue,
    createPlaylistFolder,
    deletePlaylistFolder,
    renamePlaylistFolder,
    movePlaylistFolder,
    appMode,
    setAppMode,
  } = useStore()

  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  const [creatingIn, setCreatingIn] = useState<string | null>(null) // folderId or null for root
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingSubfolderIn, setCreatingSubfolderIn] = useState<string | null>(null)
  const [newSubfolderName, setNewSubfolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number; type: 'playlist' | 'folder' } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [addToMenuOpen, setAddToMenuOpen] = useState(false)
  const [moveToMenuOpen, setMoveToMenuOpen] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [playlistViewMode, setPlaylistViewMode] = useState<'compact' | 'large'>('compact')

  // Build a quick lookup: playlistId → first track in library for cover art
  const playlistCoverTracks = useMemo(() => {
    const map = new Map<string, Track>()
    for (const pl of playlists) {
      for (const tid of pl.trackIds) {
        const t = library.find((lt) => lt.id === tid)
        if (t) { map.set(pl.id, t); break }
      }
    }
    return map
  }, [playlists, library])

  const handleCreatePlaylist = (folderId?: string): void => {
    const name = newPlaylistName.trim() || 'New Playlist'
    createPlaylist(name, folderId)
    setNewPlaylistName('')
    setCreatingPlaylist(false)
    setCreatingIn(null)
  }

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'playlist' | 'folder'): void => {
    e.preventDefault()
    e.stopPropagation()
    setAddToMenuOpen(false)
    setMoveToMenuOpen(false)
    setContextMenu({ id, x: e.clientX, y: e.clientY, type })
  }

  const handleRename = (id: string, currentName: string): void => {
    setRenamingId(id)
    setRenameValue(currentName)
    setContextMenu(null)
  }

  const handleRenameSubmit = (): void => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return }
    const isFolder = playlistFolders.some((f) => f.id === renamingId)
    if (isFolder) renamePlaylistFolder(renamingId, renameValue.trim())
    else renamePlaylist(renamingId, renameValue.trim())
    setRenamingId(null)
  }

  const closeContextMenu = (): void => {
    setContextMenu(null)
    setAddToMenuOpen(false)
    setMoveToMenuOpen(false)
  }

  const toggleFolder = (id: string): void => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Organize playlists
  const pinned = sortPlaylists(playlists.filter((p) => p.pinned), playlistSort as PlaylistSort)
  const ungrouped = sortPlaylists(playlists.filter((p) => !p.pinned && !p.folderId), playlistSort as PlaylistSort)

  // Render a folder and its children recursively
  const renderFolder = (folder: PlaylistFolder, depth = 0): JSX.Element => {
    const folderPlaylists = sortPlaylists(
      playlists.filter((p) => !p.pinned && p.folderId === folder.id),
      playlistSort as PlaylistSort
    )
    const childFolders = playlistFolders.filter((f) => f.parentId === folder.id)
    const collapsed = collapsedFolders.has(folder.id)
    const totalItems = folderPlaylists.length + childFolders.length
    const indent = depth * 12

    return (
      <div key={folder.id} style={{ marginLeft: indent }}>
        {/* Folder header — bigger/heavier than playlist rows */}
        <div
          className="flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer group transition-colors text-text-secondary hover:text-text-primary hover:bg-surface-raised"
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
        >
          <ChevronRight
            size={13}
            className={`shrink-0 transition-transform text-text-muted ${collapsed ? '' : 'rotate-90'}`}
          />
          {collapsed
            ? <Folder size={16} className="shrink-0 text-text-secondary" />
            : <FolderOpen size={16} className="shrink-0 text-text-secondary" />
          }
          {renamingId === folder.id ? (
            <input
              autoFocus
              className="flex-1 bg-transparent text-text-primary text-sm font-semibold outline-none border-b border-accent"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') setRenamingId(null)
              }}
              onBlur={handleRenameSubmit}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm font-semibold truncate">{folder.name}</span>
          )}
          <span className="text-text-muted text-xs opacity-60 shrink-0">{totalItems}</span>
          <button
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all shrink-0"
            onClick={(e) => handleContextMenu(e, folder.id, 'folder')}
          >
            <MoreHorizontal size={13} />
          </button>
        </div>

        {/* Folder contents */}
        {!collapsed && (
          <div className="pl-3">
            {/* Child folders */}
            {childFolders.map((child) => renderFolder(child, 0))}
            {/* Playlists in this folder */}
            {folderPlaylists.map((pl) => (
              <PlaylistRow
                key={pl.id}
                pl={pl}
                active={activePlaylistId === pl.id}
                renamingId={renamingId}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={() => setRenamingId(null)}
                onClick={() => { setActiveView('playlist'); setActivePlaylistId(pl.id) }}
                onContextMenu={(e) => handleContextMenu(e, pl.id, 'playlist')}
                largeMode={playlistViewMode === 'large'}
                coverTrack={playlistCoverTracks.get(pl.id)}
              />
            ))}
            {/* Inline new subfolder input */}
            {creatingSubfolderIn === folder.id && (
              <div className="mb-1 px-2">
                <input
                  autoFocus
                  className="w-full bg-surface-overlay text-text-primary text-sm rounded px-2 py-1 outline-none focus:ring-1 ring-accent"
                  placeholder="Folder name"
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (newSubfolderName.trim()) createPlaylistFolder(newSubfolderName.trim(), folder.id)
                      setNewSubfolderName(''); setCreatingSubfolderIn(null)
                    }
                    if (e.key === 'Escape') { setNewSubfolderName(''); setCreatingSubfolderIn(null) }
                  }}
                  onBlur={() => {
                    if (newSubfolderName.trim()) createPlaylistFolder(newSubfolderName.trim(), folder.id)
                    setNewSubfolderName(''); setCreatingSubfolderIn(null)
                  }}
                />
              </div>
            )}
            {/* Add playlist to folder */}
            {creatingPlaylist && creatingIn === folder.id ? (
              <div className="mb-1 px-2">
                <input
                  autoFocus
                  className="w-full bg-surface-overlay text-text-primary text-sm rounded px-2 py-1 outline-none focus:ring-1 ring-accent"
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreatePlaylist(folder.id)
                    if (e.key === 'Escape') { setCreatingPlaylist(false); setCreatingIn(null); setNewPlaylistName('') }
                  }}
                  onBlur={() => handleCreatePlaylist(folder.id)}
                />
              </div>
            ) : (
              <button
                className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-colors rounded"
                onClick={(e) => { e.stopPropagation(); setCreatingPlaylist(true); setCreatingIn(folder.id) }}
              >
                <Plus size={11} /> Add playlist
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="flex flex-col h-full bg-sidebar w-60 shrink-0 border-r border-[var(--border)]">
      {/* Logo */}
      <div className="titlebar-drag px-5 pt-10 pb-4">
        <div className="titlebar-no-drag flex items-center gap-2">
          <img src={logo} alt="unreleased" className="h-20 w-auto object-contain" />
          <span className="font-bold text-text-primary text-lg tracking-[0.08em]">unreleased</span>
        </div>
      </div>

      {/* Local / API toggle */}
      <div className="px-4 mb-3">
        <div className="flex rounded-lg bg-surface-overlay p-0.5 gap-0.5">
          <button
            onClick={() => { setAppMode('local'); setActiveView('library'); setActivePlaylistId(null) }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${appMode === 'local' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            Local
          </button>
          <button
            onClick={() => { setAppMode('api'); setActiveView('api-tracker'); setActivePlaylistId(null) }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${appMode === 'api' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            API
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-1">
        {appMode === 'local' ? (
          <>
            <SidebarItem
              icon={<Music2 size={18} />}
              label="Library"
              active={activeView === 'library'}
              count={library.length}
              onClick={() => { setActiveView('library'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<Disc3 size={18} />}
              label="Albums"
              active={activeView === 'albums'}
              onClick={() => { setActiveView('albums'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<Users size={18} />}
              label="Artists"
              active={activeView === 'artists'}
              onClick={() => { setActiveView('artists'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<Tag size={18} />}
              label="Genres"
              active={activeView === 'genres'}
              onClick={() => { setActiveView('genres'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<Mic2 size={18} />}
              label="Lyrics"
              active={activeView === 'lyrics'}
              onClick={() => { setActiveView('lyrics'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<Heart size={18} />}
              label="Liked Songs"
              active={activeView === 'liked'}
              onClick={() => { setActiveView('liked'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<HardDrive size={18} />}
              label="Files"
              active={activeView === 'files'}
              onClick={() => { setActiveView('files'); setActivePlaylistId(null) }}
            />
          </>
        ) : (
          <>
            <SidebarItem
              icon={<LayoutDashboard size={18} />}
              label="Categories"
              active={activeView === 'api-categories'}
              onClick={() => { setActiveView('api-categories'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<SearchCode size={18} />}
              label="Tracker"
              active={activeView === 'api-tracker'}
              onClick={() => { setActiveView('api-tracker'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<Radio size={18} />}
              label="Radio"
              active={activeView === 'api-radio'}
              onClick={() => { setActiveView('api-radio'); setActivePlaylistId(null) }}
            />
            <SidebarItem
              icon={<HardDrive size={18} />}
              label="Files"
              active={activeView === 'api-files'}
              onClick={() => { setActiveView('api-files'); setActivePlaylistId(null) }}
            />
          </>
        )}
      </nav>

      {/* Playlists — local mode only */}
      {appMode === 'local' && <div className="mt-6 px-3 flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Section header */}
        <div className="flex items-center justify-between px-2 mb-2 shrink-0">
          <button
            onClick={() => { setActiveView('playlists'); setActivePlaylistId(null) }}
            className={`text-xs font-semibold uppercase tracking-widest transition-colors ${activeView === 'playlists' ? 'text-accent' : 'text-text-muted hover:text-text-primary'}`}
          >
            Playlists
          </button>
          <div className="flex items-center gap-1">
            {/* Large/compact toggle */}
            <button
              className="text-text-muted hover:text-text-primary transition-colors"
              title={playlistViewMode === 'compact' ? 'Large view' : 'Compact view'}
              onClick={(e) => { e.stopPropagation(); setPlaylistViewMode((v) => v === 'compact' ? 'large' : 'compact') }}
            >
              {playlistViewMode === 'compact' ? <LayoutList size={14} /> : <LayoutGrid size={14} />}
            </button>
            {/* Sort menu */}
            <div className="relative">
              <button
                className="text-text-muted hover:text-text-primary transition-colors"
                title="Sort playlists"
                onClick={(e) => { e.stopPropagation(); setShowSortMenu((v) => !v) }}
              >
                <ArrowUpDown size={14} />
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-surface-highest border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[140px] animate-scale-in">
                    {([['manual', 'Custom order'], ['name', 'Name'], ['date', 'Date added']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => { setPlaylistSort(val); setShowSortMenu(false) }}
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm transition-colors ${
                          playlistSort === val ? 'text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
                        }`}
                      >
                        {label}
                        {playlistSort === val && <ListOrdered size={12} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* New folder */}
            <button
              className="text-text-muted hover:text-text-primary transition-colors"
              title="New folder"
              onClick={() => setCreatingFolder(true)}
            >
              <FolderPlus size={14} />
            </button>
            {/* New playlist */}
            <button
              className="text-text-muted hover:text-text-primary transition-colors"
              title="New playlist"
              onClick={() => { setCreatingPlaylist(true); setCreatingIn(null) }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 space-y-0.5 min-h-0" onClick={closeContextMenu}>
          {/* New folder input */}
          {creatingFolder && (
            <div className="mb-1 px-2">
              <input
                autoFocus
                className="w-full bg-surface-overlay text-text-primary text-sm rounded px-2 py-1 outline-none focus:ring-1 ring-accent"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (newFolderName.trim()) createPlaylistFolder(newFolderName.trim())
                    setNewFolderName(''); setCreatingFolder(false)
                  }
                  if (e.key === 'Escape') { setNewFolderName(''); setCreatingFolder(false) }
                }}
                onBlur={() => {
                  if (newFolderName.trim()) createPlaylistFolder(newFolderName.trim())
                  setNewFolderName(''); setCreatingFolder(false)
                }}
              />
            </div>
          )}

          {/* New root playlist input */}
          {creatingPlaylist && creatingIn === null && (
            <div className="mb-1 px-2">
              <input
                autoFocus
                className="w-full bg-surface-overlay text-text-primary text-sm rounded px-2 py-1 outline-none focus:ring-1 ring-accent"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePlaylist()
                  if (e.key === 'Escape') { setCreatingPlaylist(false); setNewPlaylistName('') }
                }}
                onBlur={() => handleCreatePlaylist()}
              />
            </div>
          )}

          {/* Pinned playlists */}
          {pinned.map((pl) => (
            <PlaylistRow
              key={pl.id}
              pl={pl}
              active={activePlaylistId === pl.id}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={() => setRenamingId(null)}
              onClick={() => { setActiveView('playlist'); setActivePlaylistId(pl.id) }}
              onContextMenu={(e) => handleContextMenu(e, pl.id, 'playlist')}
              pinned
              largeMode={playlistViewMode === 'large'}
              coverTrack={playlistCoverTracks.get(pl.id)}
            />
          ))}

          {/* Ungrouped playlists */}
          {ungrouped.map((pl) => (
            <PlaylistRow
              key={pl.id}
              pl={pl}
              active={activePlaylistId === pl.id}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={() => setRenamingId(null)}
              onClick={() => { setActiveView('playlist'); setActivePlaylistId(pl.id) }}
              onContextMenu={(e) => handleContextMenu(e, pl.id, 'playlist')}
              largeMode={playlistViewMode === 'large'}
              coverTrack={playlistCoverTracks.get(pl.id)}
            />
          ))}

          {/* Root-level folders (no parentId) */}
          {playlistFolders.filter((f) => !f.parentId).map((folder) => renderFolder(folder))}
        </div>
      </div>}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div
            className="fixed z-50 bg-surface-highest border border-[var(--border)] rounded-lg shadow-2xl py-1 min-w-[190px]"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 300) }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.type === 'playlist' ? (
              <>
                {/* Playlist context menu */}
                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  onClick={() => { addPlaylistToQueue(contextMenu.id); closeContextMenu() }}
                >
                  <ListPlus size={14} /> Add to queue
                </button>

                <div className="border-t border-[var(--border)] my-1" />

                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  onClick={() => {
                    togglePlaylistPin(contextMenu.id)
                    closeContextMenu()
                  }}
                >
                  {playlists.find((p) => p.id === contextMenu.id)?.pinned
                    ? <><PinOff size={14} /> Unpin</>
                    : <><Pin size={14} /> Pin to top</>
                  }
                </button>

                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  onClick={() => {
                    const pl = playlists.find((p) => p.id === contextMenu.id)
                    if (pl) handleRename(pl.id, pl.name)
                  }}
                >
                  <Pencil size={14} /> Rename
                </button>

                {/* Move to folder */}
                {playlistFolders.length > 0 && (
                  <button
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                    onClick={() => setMoveToMenuOpen((v) => !v)}
                  >
                    <span className="flex items-center gap-2"><Folder size={14} /> Move to folder</span>
                    <ChevronRight size={12} className={`transition-transform ${moveToMenuOpen ? 'rotate-90' : ''}`} />
                  </button>
                )}

                {moveToMenuOpen && (
                  <div className="border-t border-[var(--border)] py-1">
                    {playlists.find((p) => p.id === contextMenu.id)?.folderId && (
                      <button
                        className="flex items-center gap-2 w-full px-6 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                        onClick={() => { movePlaylistToFolder(contextMenu.id, null); closeContextMenu() }}
                      >
                        Remove from folder
                      </button>
                    )}
                    {playlistFolders.map((f) => (
                      <button
                        key={f.id}
                        className="flex items-center gap-2 w-full px-6 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                        onClick={() => { movePlaylistToFolder(contextMenu.id, f.id); closeContextMenu() }}
                      >
                        <Folder size={13} /> {f.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Add to other playlist */}
                <button
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  onClick={() => setAddToMenuOpen((v) => !v)}
                >
                  <span className="flex items-center gap-2"><ListMusic size={14} /> Add to playlist</span>
                  <ChevronRight size={12} className={`transition-transform ${addToMenuOpen ? 'rotate-90' : ''}`} />
                </button>

                {addToMenuOpen && (
                  <div className="border-t border-[var(--border)] py-1">
                    {playlists.filter((p) => p.id !== contextMenu.id).length === 0 ? (
                      <p className="px-6 py-2 text-xs text-text-muted">No other playlists</p>
                    ) : (
                      playlists.filter((p) => p.id !== contextMenu.id).map((pl) => {
                        const source = playlists.find((p) => p.id === contextMenu.id)
                        return (
                          <button
                            key={pl.id}
                            className="flex items-center gap-2 w-full px-6 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                            onClick={() => {
                              if (source) addTracksToPlaylist(pl.id, source.trackIds)
                              closeContextMenu()
                            }}
                          >
                            <ListMusic size={13} /><span className="truncate">{pl.name}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}

                <div className="border-t border-[var(--border)] mt-1 pt-1">
                  <button
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-surface-overlay transition-colors"
                    onClick={() => {
                      deletePlaylist(contextMenu.id)
                      if (activePlaylistId === contextMenu.id) {
                        setActiveView('library'); setActivePlaylistId(null)
                      }
                      closeContextMenu()
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Folder context menu */}
                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  onClick={() => { setCreatingPlaylist(true); setCreatingIn(contextMenu.id); closeContextMenu() }}
                >
                  <Plus size={14} /> Add playlist here
                </button>
                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  onClick={() => {
                    // Expand folder and show inline input
                    setCollapsedFolders((prev) => { const next = new Set(prev); next.delete(contextMenu.id); return next })
                    setCreatingSubfolderIn(contextMenu.id)
                    closeContextMenu()
                  }}
                >
                  <FolderPlus size={14} /> New folder inside
                </button>

                {/* Move folder to another folder */}
                {playlistFolders.filter((f) => f.id !== contextMenu.id && f.parentId !== contextMenu.id).length > 0 && (
                  <>
                    <div className="border-t border-[var(--border)] my-1" />
                    <button
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                      onClick={() => setMoveToMenuOpen((v) => !v)}
                    >
                      <span className="flex items-center gap-2"><Folder size={14} /> Move to folder</span>
                      <ChevronRight size={12} className={`transition-transform ${moveToMenuOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {moveToMenuOpen && (
                      <div className="border-t border-[var(--border)] py-1">
                        {playlistFolders.find((f) => f.id === contextMenu.id)?.parentId && (
                          <button
                            className="flex items-center gap-2 w-full px-6 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                            onClick={() => { movePlaylistFolder(contextMenu.id, null); closeContextMenu() }}
                          >
                            Remove from folder
                          </button>
                        )}
                        {playlistFolders
                          .filter((f) => f.id !== contextMenu.id && f.parentId !== contextMenu.id)
                          .map((f) => (
                            <button
                              key={f.id}
                              className="flex items-center gap-2 w-full px-6 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                              onClick={() => { movePlaylistFolder(contextMenu.id, f.id); closeContextMenu() }}
                            >
                              <Folder size={13} /> {f.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </>
                )}

                <div className="border-t border-[var(--border)] my-1" />
                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  onClick={() => {
                    const f = playlistFolders.find((f) => f.id === contextMenu.id)
                    if (f) handleRename(f.id, f.name)
                  }}
                >
                  <Pencil size={14} /> Rename folder
                </button>
                <div className="border-t border-[var(--border)] mt-1 pt-1">
                  <button
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-surface-overlay transition-colors"
                    onClick={() => { deletePlaylistFolder(contextMenu.id); closeContextMenu() }}
                  >
                    <Trash2 size={14} /> Delete folder
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  )
}

function PlaylistRow({ pl, active, renamingId, renameValue, onRenameChange, onRenameSubmit, onRenameCancel, onClick, onContextMenu, pinned, largeMode, coverTrack }: {
  pl: Playlist
  active: boolean
  renamingId: string | null
  renameValue: string
  onRenameChange: (v: string) => void
  onRenameSubmit: () => void
  onRenameCancel: () => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  pinned?: boolean
  largeMode?: boolean
  coverTrack?: Track
}): JSX.Element {
  return (
    <div
      className={`flex items-center gap-2 px-2 rounded cursor-pointer group transition-colors ${
        largeMode ? 'py-2' : 'py-1.5'
      } ${
        active
          ? 'bg-surface-highest text-text-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
      }`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {largeMode ? (
        <div className="w-9 h-9 rounded shrink-0 overflow-hidden bg-surface-overlay flex items-center justify-center">
          {coverTrack ? (
            <AlbumArtThumbnail track={coverTrack} size={36} className="w-full h-full" />
          ) : (
            <ListMusic size={16} className="text-text-muted" />
          )}
        </div>
      ) : (
        pinned
          ? <Pin size={13} className="shrink-0 text-accent" />
          : <ListMusic size={16} className="shrink-0" />
      )}
      {renamingId === pl.id ? (
        <input
          autoFocus
          className="flex-1 bg-transparent text-text-primary text-sm outline-none border-b border-accent"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameSubmit()
            if (e.key === 'Escape') onRenameCancel()
          }}
          onBlur={onRenameSubmit}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm truncate">{pl.name}</span>
      )}
      {largeMode && pinned && <Pin size={11} className="shrink-0 text-accent" />}
      <button
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all"
        onClick={(e) => onContextMenu(e)}
      >
        <MoreHorizontal size={14} />
      </button>
    </div>
  )
}

function SidebarItem({
  icon, label, active, count, onClick
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  count?: number
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
        active ? 'bg-surface-raised text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && <span className="text-text-muted text-xs">{count}</span>}
    </button>
  )
}
