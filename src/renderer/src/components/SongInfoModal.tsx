import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { X, Music2, Pencil, Link2 } from 'lucide-react'
import { JWApiSong, CATEGORY_LABELS, buildImageUrl, parseDuration, apiFetch } from '../lib/juicewrldApi'
import { versionsEnabled, getVersionGroup, linkSongVersion, unlinkSongVersion, setVersionMeta, SongVersionMeta } from '../lib/versionsApi'
import { useStore } from '../store/useStore'

function formatDur(secs: number): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const CATEGORY_COLORS: Record<string, string> = {
  released:          'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  unreleased:        'bg-blue-500/15 text-blue-400 border-blue-500/25',
  unsurfaced:        'bg-orange-500/15 text-orange-400 border-orange-500/25',
  recording_session: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
}

function Row({ label, value }: { label: string; value: string | null | undefined }): JSX.Element | null {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-text-muted text-xs shrink-0 w-28 pt-px">{label}</span>
      <span className="text-text-primary text-xs leading-relaxed whitespace-pre-wrap flex-1">{value}</span>
    </div>
  )
}

function GroupLabel({ children }: { children: string }): JSX.Element {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted pt-4 pb-1 first:pt-0">
      {children}
    </p>
  )
}

interface Props {
  song: JWApiSong | null
  onClose: () => void
  onEdit?: (songId: number) => void
}

export default function SongInfoModal({ song, onClose, onEdit }: Props): JSX.Element | null {
  const overlayRef = useRef<HTMLDivElement>(null)
  const { account } = useStore(useShallow(s => ({ account: s.account })))

  // Clicking a linked version swaps the displayed song in place, without the
  // caller needing to manage that — falls back to the `song` prop otherwise.
  const [overrideSong, setOverrideSong] = useState<JWApiSong | null>(null)
  useEffect(() => { setOverrideSong(null) }, [song?.id])
  const displaySong = overrideSong ?? song

  // "Other versions" — a separate database from juicewrldapi.com (see
  // lib/versionsApi.ts), since that API has no concept of grouping e.g.
  // "Song (v1)" / "(v2)" / "(TV Mix)" together as the same underlying song.
  const [versions, setVersions] = useState<{ song: JWApiSong; meta: SongVersionMeta }[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [showLinkSearch, setShowLinkSearch] = useState(false)
  const [linkQuery, setLinkQuery] = useState('')
  const [linkResults, setLinkResults] = useState<JWApiSong[]>([])
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const linkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshVersions = (id: number): void => {
    if (!versionsEnabled) return
    setLoadingVersions(true)
    getVersionGroup(id)
      .then(metas => Promise.all(metas.map(meta =>
        apiFetch<JWApiSong>(`/songs/${meta.songId}/`).then(song => ({ song, meta })).catch(() => null)
      )))
      .then(entries => setVersions(entries.filter((e): e is { song: JWApiSong; meta: SongVersionMeta } => !!e)))
      .finally(() => setLoadingVersions(false))
  }

  useEffect(() => {
    setShowLinkSearch(false); setLinkQuery(''); setLinkResults([]); setLinkError(null)
    if (displaySong) refreshVersions(displaySong.id)
    else setVersions([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySong?.id])

  useEffect(() => {
    if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current)
    if (!linkQuery.trim()) { setLinkResults([]); return }
    linkDebounceRef.current = setTimeout(() => {
      apiFetch<{ results: JWApiSong[] }>('/songs/', { search: linkQuery.trim(), page_size: 8 })
        .then(data => setLinkResults((data.results ?? []).filter(r => r.id !== displaySong?.id)))
        .catch(() => setLinkResults([]))
    }, 350)
    return () => { if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkQuery])

  const handleLink = async (otherId: number): Promise<void> => {
    if (!displaySong || linking) return
    setLinking(true)
    setLinkError(null)
    try {
      await linkSongVersion(displaySong.id, otherId, account?.display_name ?? null)
      refreshVersions(displaySong.id)
      setShowLinkSearch(false); setLinkQuery(''); setLinkResults([])
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to link version')
    } finally { setLinking(false) }
  }

  const handleUnlink = async (versionId: number): Promise<void> => {
    if (!displaySong) return
    setLinkError(null)
    try {
      await unlinkSongVersion(versionId)
      refreshVersions(displaySong.id)
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to unlink version')
    }
  }

  const handleUpdateMeta = async (
    versionId: number,
    meta: { version?: number | null; versionTitle?: string | null }
  ): Promise<void> => {
    if (!displaySong) return
    setLinkError(null)
    try {
      await setVersionMeta(versionId, meta)
      refreshVersions(displaySong.id)
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to update version info')
    }
  }

  const handleViewVersion = async (id: number): Promise<void> => {
    try {
      const s = await apiFetch<JWApiSong>(`/songs/${id}/`)
      setOverrideSong(s)
    } catch {}
  }

  if (!displaySong) return null

  const coverUrl = buildImageUrl(displaySong.image_url)
  const primaryTitle = displaySong.track_titles?.[0] || displaySong.name
  const altTitles = displaySong.track_titles?.slice(1).filter(Boolean) ?? []
  const duration = formatDur(parseDuration(displaySong.length))
  const catColor = CATEGORY_COLORS[displaySong.category] ?? 'bg-surface-overlay text-text-muted border-[var(--border)]'
  const catLabel = CATEGORY_LABELS[displaySong.category] ?? displaySong.category

  const hasRecording = displaySong.recording_locations || displaySong.record_dates
  const hasImportantDates = displaySong.preview_date || displaySong.release_date || displaySong.dates
  const hasInstrumentals = displaySong.instrumentals || displaySong.instrumental_names
  const hasSession = displaySong.session_titles || displaySong.session_tracking

  let notesDisplay: string | null = null
  if (displaySong.notes) {
    try {
      const parsed = JSON.parse(displaySong.notes)
      if (typeof parsed === 'object' && parsed !== null) {
        notesDisplay = Object.entries(parsed)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      } else {
        notesDisplay = String(parsed)
      }
    } catch {
      notesDisplay = displaySong.notes
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-surface border border-[var(--border)] rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[92svh] md:max-h-[86vh] flex flex-col overflow-hidden">

        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden">
          {coverUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center scale-110"
              style={{ backgroundImage: `url(${coverUrl})`, filter: 'blur(24px) brightness(0.35)' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />
          {onEdit && (
            <button
              onClick={() => { onEdit(displaySong.id); onClose() }}
              className="absolute top-3 right-12 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white transition-colors"
              title="Edit song info"
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
          <div className="relative flex items-end gap-4 px-5 pt-8 pb-5">
            <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden shadow-2xl bg-surface-overlay">
              {coverUrl ? (
                <img src={coverUrl} alt={primaryTitle} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 size={32} className="text-text-muted opacity-30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-0.5">
              <h2 className="text-white font-bold text-xl leading-tight">{primaryTitle}</h2>
              {altTitles.length > 0 && (
                <p className="text-white/50 text-xs mt-0.5 truncate italic">aka {altTitles.join(' · ')}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catColor}`}>
                  {catLabel}
                </span>
                {displaySong.era?.name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/15">
                    {displaySong.era.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable info */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          <div>
            <Row label="Artist" value={displaySong.credited_artists || 'Juice WRLD'} />
            <Row label="Alt names" value={altTitles.length > 0 ? altTitles.join('\n') : null} />
            <Row label="Duration" value={parseDuration(displaySong.length) ? duration : null} />
            <Row label="Leak type" value={displaySong.leak_type} />
            <Row label="Date leaked" value={displaySong.date_leaked} />
            <Row label="Bitrate" value={displaySong.bitrate} />
          </div>

          {versionsEnabled && (
            <>
              <GroupLabel>Other Versions</GroupLabel>
              <div className="pb-2.5 border-b border-[var(--border)]">
                {loadingVersions ? (
                  <p className="text-text-muted text-xs py-1">Loading…</p>
                ) : versions.length === 0 ? (
                  <p className="text-text-muted text-xs py-1">No other versions linked.</p>
                ) : (
                  <div className="space-y-1">
                    {versions.map(({ song: v, meta }) => (
                      <div key={v.id} className="group">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewVersion(v.id)}
                            className="flex-1 min-w-0 text-left hover:bg-surface-overlay rounded-lg px-1.5 py-1 -mx-1.5 transition-colors"
                          >
                            <span className="text-text-primary text-xs truncate block">
                              {v.track_titles?.[0] || v.name}
                              {meta.version != null && <span className="text-text-muted"> (v{meta.version}{meta.versionTitle ? ` — ${meta.versionTitle}` : ''})</span>}
                              {meta.version == null && meta.versionTitle && <span className="text-text-muted"> ({meta.versionTitle})</span>}
                            </span>
                          </button>
                          {onEdit && (
                            <button
                              onClick={() => handleUnlink(v.id)}
                              title="Unlink this version"
                              className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        {onEdit ? (
                          <div className="flex items-center gap-1.5 px-1.5 pb-1">
                            <input
                              type="number"
                              defaultValue={meta.version ?? ''}
                              placeholder="Version #"
                              onBlur={(e) => {
                                const val = e.target.value.trim()
                                handleUpdateMeta(v.id, { version: val ? Number(val) : null })
                              }}
                              className="w-16 bg-surface-overlay border border-[var(--border)] rounded px-1.5 py-0.5 text-[11px] text-text-primary focus:outline-none"
                            />
                            <input
                              type="text"
                              defaultValue={meta.versionTitle ?? ''}
                              placeholder="Version title"
                              onBlur={(e) => handleUpdateMeta(v.id, { versionTitle: e.target.value.trim() || null })}
                              className="flex-1 min-w-0 bg-surface-overlay border border-[var(--border)] rounded px-1.5 py-0.5 text-[11px] text-text-primary focus:outline-none"
                            />
                          </div>
                        ) : meta.addedBy ? (
                          <p className="text-text-muted text-[10px] px-1.5 pb-1">Added by {meta.addedBy}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {onEdit && (
                  showLinkSearch ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1.5">
                        <input
                          value={linkQuery}
                          onChange={(e) => setLinkQuery(e.target.value)}
                          placeholder="Search song name…"
                          autoFocus
                          className="flex-1 min-w-0 bg-surface-overlay border border-[var(--border)] rounded px-2 py-1 text-xs text-text-primary focus:outline-none"
                        />
                        <button
                          onClick={() => { setShowLinkSearch(false); setLinkQuery(''); setLinkResults([]) }}
                          className="text-text-muted hover:text-text-primary text-xs px-1"
                        >
                          Cancel
                        </button>
                      </div>
                      {linkResults.length > 0 && (
                        <div className="max-h-32 overflow-y-auto space-y-0.5">
                          {linkResults.map(r => (
                            <button
                              key={r.id}
                              disabled={linking}
                              onClick={() => handleLink(r.id)}
                              className="w-full text-left px-2 py-1.5 rounded text-xs text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors truncate disabled:opacity-50"
                            >
                              {r.track_titles?.[0] || r.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLinkSearch(true)}
                      className="mt-2 flex items-center gap-1.5 text-accent text-xs hover:underline"
                    >
                      <Link2 size={12} /> Link a version
                    </button>
                  )
                )}
                {linkError && (
                  <p className="mt-2 text-red-400 text-xs">{linkError}</p>
                )}
              </div>
            </>
          )}

          {(displaySong.producers || displaySong.engineers) && (
            <>
              <GroupLabel>Credits</GroupLabel>
              <div>
                <Row label="Producers" value={displaySong.producers} />
                <Row label="Engineers" value={displaySong.engineers} />
              </div>
            </>
          )}

          {hasRecording && (
            <>
              <GroupLabel>Recording</GroupLabel>
              <div>
                <Row label="Location" value={displaySong.recording_locations} />
                <Row label="Date" value={displaySong.record_dates} />
              </div>
            </>
          )}

          {hasImportantDates && (
            <>
              <GroupLabel>Dates</GroupLabel>
              <div>
                <Row label="Released" value={displaySong.release_date} />
                <Row label="Preview" value={displaySong.preview_date} />
                <Row label="Other" value={displaySong.dates} />
              </div>
            </>
          )}

          {hasInstrumentals && (
            <>
              <GroupLabel>Instrumentals</GroupLabel>
              <div>
                <Row label="Info" value={displaySong.instrumentals} />
                {displaySong.instrumental_names !== displaySong.instrumentals && (
                  <Row label="Names" value={displaySong.instrumental_names} />
                )}
              </div>
            </>
          )}

          {hasSession && (
            <>
              <GroupLabel>Session</GroupLabel>
              <div>
                <Row label="Titles" value={displaySong.session_titles} />
                <Row label="Tracking" value={displaySong.session_tracking} />
              </div>
            </>
          )}

          {displaySong.file_names && (
            <>
              <GroupLabel>File Names</GroupLabel>
              <p className="text-text-primary text-[11px] font-mono leading-relaxed pb-2.5 border-b border-[var(--border)]">
                {displaySong.file_names}
              </p>
            </>
          )}

          {displaySong.additional_information && (
            <>
              <GroupLabel>Additional Info</GroupLabel>
              <p className="text-text-primary text-xs leading-relaxed pb-2.5 border-b border-[var(--border)] whitespace-pre-wrap">
                {displaySong.additional_information}
              </p>
            </>
          )}

          {notesDisplay && (
            <>
              <GroupLabel>Notes</GroupLabel>
              <p className="text-text-primary text-xs leading-relaxed pb-2.5 border-b border-[var(--border)] whitespace-pre-wrap">
                {notesDisplay}
              </p>
            </>
          )}

          {displaySong.lyrics && (
            <>
              <GroupLabel>Lyrics</GroupLabel>
              <pre className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap font-sans pb-2">
                {displaySong.lyrics}
              </pre>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
