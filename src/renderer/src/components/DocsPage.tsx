import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

// ─── Small reusable primitives ────────────────────────────────────────────────

function Badge({ children, color = 'default' }: { children: string; color?: 'get' | 'post' | 'delete' | 'patch' | 'default' }) {
  const styles: Record<string, string> = {
    get:     'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25',
    post:    'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    delete:  'bg-red-500/15 text-red-400 border border-red-500/25',
    patch:   'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    default: 'bg-[var(--surface-raised)] text-text-muted border border-[var(--border)]',
  }
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded font-mono ${styles[color]}`}>
      {children}
    </span>
  )
}

function Code({ children }: { children: string }) {
  return (
    <code className="bg-[var(--surface-raised)] text-accent border border-[var(--border)] text-[11px] font-mono px-1.5 py-0.5 rounded">
      {children}
    </code>
  )
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl text-[11px] font-mono text-text-secondary p-4 overflow-x-auto whitespace-pre leading-relaxed">
      {children}
    </pre>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | JSX.Element)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-text-muted text-xs font-semibold uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? '' : 'bg-[var(--surface-raised)]/40'}`}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-text-secondary align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)] transition-colors text-left"
      >
        <span className="text-text-primary font-semibold text-sm">{title}</span>
        {open ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
      </button>
      {open && <div className="p-5 space-y-4 bg-[var(--surface)]">{children}</div>}
    </div>
  )
}

function Endpoint({ method, path, description }: { method: 'GET' | 'POST' | 'DELETE' | 'PATCH'; path: string; description: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Badge color={method.toLowerCase() as 'get' | 'post' | 'delete' | 'patch'}>{method}</Badge>
      <div className="min-w-0">
        <code className="text-[12px] font-mono text-text-primary">{path}</code>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
    </div>
  )
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div className="space-y-6">
      <Section title="Introduction">
        <p className="text-sm text-text-secondary leading-relaxed">
          The Juice WRLD API provides programmatic access to the most comprehensive Juice WRLD music database —
          over 2,700 catalogued songs, unreleased tracks, file browsing, and rich metadata. No API key required
          for public read endpoints.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-text-muted">Base URL</span>
          <Code>https://juicewrldapi.com/juicewrld</Code>
        </div>
        <a
          href="https://juicewrldapi.com/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
        >
          Open live API docs <ExternalLink size={11} />
        </a>
      </Section>

      <Section title="Endpoint Overview">
        <div className="divide-y divide-[var(--border)]">
          <Endpoint method="GET" path="/songs/" description="List, filter, search and paginate songs" />
          <Endpoint method="GET" path="/songs/{id}/" description="Single song by internal ID" />
          <Endpoint method="GET" path="/categories/" description="Available category values with labels" />
          <Endpoint method="GET" path="/eras/" description="All eras — flat array, not paginated" />
          <Endpoint method="GET" path="/stats/" description="Database-wide counts by category and era" />
          <Endpoint method="GET" path="/radio/random/" description="Random playable song with full metadata" />
          <Endpoint method="GET" path="/files/browse/" description="Browse the file system" />
          <Endpoint method="GET" path="/files/info/" description="Metadata for a single file" />
          <Endpoint method="GET" path="/files/cover-art/" description="Cover art image for an audio file" />
          <Endpoint method="GET" path="/files/download/" description="Stream/download audio — supports Range requests" />
          <Endpoint method="POST" path="/playlists/share/" description="Create a public shared playlist link" />
          <Endpoint method="GET" path="/playlists/shared/{share_id}/" description="Fetch a shared playlist by ID" />
          <Endpoint method="POST" path="/plays/" description="Record a play event (no auth required)" />
          <Endpoint method="GET" path="/accounts/account/me/" description="Current user info (public-facing)" />
          <Endpoint method="GET" path="/accounts/me/" description="Current user with role — editor/admin dashboards" />
          <Endpoint method="POST" path="/accounts/editor/proposals/" description="Submit an edit proposal (editor+)" />
          <Endpoint method="GET" path="/library/favorites/" description="List personal favorites (any logged-in user)" />
          <Endpoint method="POST" path="/library/favorites/" description="Add a favorite" />
          <Endpoint method="DELETE" path="/library/favorites/{song_id}/" description="Remove a favorite" />
          <Endpoint method="GET" path="/library/playlists/" description="List personal playlists" />
          <Endpoint method="POST" path="/library/playlists/" description="Create a personal playlist" />
          <Endpoint method="PATCH" path="/library/playlists/{id}/" description="Update name, description, cover, track order" />
          <Endpoint method="DELETE" path="/library/playlists/{id}/" description="Delete a personal playlist" />
          <Endpoint method="POST" path="/library/playlists/{id}/items/" description="Add a track to a playlist" />
          <Endpoint method="DELETE" path="/library/playlists/{id}/items/{song_id}/" description="Remove a track from a playlist" />
        </div>
      </Section>

      <Section title="Songs Object — Full Shape">
        <Pre>{`{
  "id": 1,
  "public_id": 123,
  "name": "Song Title",
  "original_key": "Original JSON Key",
  "category": "released|unreleased|unsurfaced|recording_session",
  "path": "Compilation/folder/song.mp3",
  "era": {
    "id": 1,
    "name": "Era Name",
    "description": "Era Description",
    "time_frame": "Time Period",
    "play_count": 0
  },
  "track_titles": ["Title 1", "Title 2"],
  "credited_artists": "Artist Names",
  "producers": "Producer Names",
  "engineers": "Engineer Names",
  "recording_locations": "Studio Locations",
  "record_dates": "Recording Dates",
  "length": "3:59",
  "bitrate": "Bitrate Info",
  "additional_information": "Extra Info",
  "file_names": "File Name(s)",
  "preview_date": "Preview Date",
  "release_date": "Release Date",
  "dates": "Additional Dates",
  "session_titles": "Session Titles",
  "session_tracking": "Session Tracking",
  "notes": "Combined Notes (JSON string)",
  "lyrics": "Song Lyrics",
  "synced_lyrics": "Timestamped lyrics (karaoke-style)",
  "album": "Album Name",
  "snippets": [],
  "date_leaked": "Leak Date",
  "leak_type": "Leak Type",
  "image_url": "/assets/era-image.webp"
}`}</Pre>
        <p className="text-xs text-text-muted">
          <Code>image_url</Code> is relative — prepend <Code>https://juicewrldapi.com</Code> before use.
        </p>
      </Section>
    </div>
  )
}

function SongsTab() {
  return (
    <div className="space-y-6">
      <Section title="GET /songs/ — List & Search">
        <p className="text-sm text-text-secondary">Paginated song list with rich filtering. All params are optional.</p>
        <Table
          headers={['Param', 'Type', 'Description']}
          rows={[
            [<Code>page</Code>, 'number', 'Page number (default: 1)'],
            [<Code>page_size</Code>, 'number', 'Results per page (default: 20)'],
            [<Code>category</Code>, 'string', <><Code>released</Code>, <Code>unreleased</Code>, <Code>unsurfaced</Code>, <Code>recording_session</Code></>],
            [<Code>era</Code>, 'string', 'Era name e.g. "Goodbye & Good Riddance"'],
            [<Code>search</Code>, 'string', 'Search names, artists, track titles (normalizes special chars — "dont" matches "don\'t")'],
            [<Code>searchall</Code>, 'string', 'Search names, artists, producers, track titles'],
            [<Code>lyrics</Code>, 'string', 'Full-text search within lyrics content'],
            [<Code>file_names_array</Code>, 'string', '"true" to return file_names as array instead of string'],
          ]}
        />
        <p className="text-xs text-text-muted font-semibold mt-2">Response shape:</p>
        <Pre>{`{
  "count": 1234,
  "next": "https://juicewrldapi.com/juicewrld/songs/?page=2",
  "previous": null,
  "results": [ /* Song objects */ ]
}`}</Pre>
      </Section>

      <Section title="GET /songs/{id}/ — Single Song">
        <p className="text-sm text-text-secondary">Returns a full song object by internal ID (<Code>song.id</Code>, not <Code>public_id</Code>).</p>
      </Section>

      <Section title="GET /categories/">
        <Pre>{`{
  "categories": [
    { "value": "released",          "label": "Released" },
    { "value": "unreleased",        "label": "Unreleased" },
    { "value": "unsurfaced",        "label": "Unsurfaced" },
    { "value": "recording_session", "label": "Studio Sessions" }
  ]
}`}</Pre>
      </Section>

      <Section title="GET /eras/">
        <p className="text-sm text-text-secondary">Returns a flat array — not paginated.</p>
        <Pre>{`[
  { "id": 1, "name": "JuiceTheKidd",            "time_frame": "(~2014–February 2017)" },
  { "id": 2, "name": "Affliction",              "time_frame": "(February 2017–May 2017)" },
  { "id": 3, "name": "Juice WRLD 999",          "time_frame": "(May 2017–May 2018)" },
  { "id": 4, "name": "Goodbye & Good Riddance", "time_frame": "(May 2018–August 2018)" },
  { "id": 5, "name": "World On Drugs",          "time_frame": "(August 2018–December 2018)" },
  { "id": 6, "name": "Death Race For Love",     "time_frame": "(December 2018–December 2019)" }
]`}</Pre>
      </Section>

      <Section title="GET /stats/">
        <Pre>{`{
  "total_songs": 39847,
  "category_stats": {
    "released": 156,
    "unreleased": 2847,
    "unsurfaced": 15234,
    "recording_session": 21610
  },
  "era_stats": {
    "JuiceTheKidd": 5234,
    "Affliction": 1847,
    "Juice WRLD 999": 8934
  }
}`}</Pre>
      </Section>

      <Section title="GET /radio/random/">
        <p className="text-sm text-text-secondary">Returns a random playable song with full metadata and stream path.</p>
        <Pre>{`{
  "id": "Compilation/1. Released Discography/.../song.mp3",
  "title": "Song Title",
  "path": "Compilation/1. Released Discography/.../song.mp3",
  "size": 5195736,
  "modified": "2025-10-18T19:19:53.784271",
  "hash": "d199a85e510b32b9ef3c02a29044a41d",
  "song": { /* Full song object */ }
}`}</Pre>
      </Section>
    </div>
  )
}

function FilesTab() {
  return (
    <div className="space-y-6">
      <Section title="GET /files/browse/ — Directory Listing">
        <Table
          headers={['Param', 'Required', 'Description']}
          rows={[
            [<Code>path</Code>, 'No', 'Directory path relative to compilation root'],
            [<Code>search</Code>, 'No', 'Filter items by name (e.g. ".mp3")'],
          ]}
        />
      </Section>

      <Section title="GET /files/info/ — File Metadata">
        <Table
          headers={['Param', 'Required', 'Description']}
          rows={[
            [<Code>path</Code>, 'Yes', 'File path relative to compilation root'],
          ]}
        />
      </Section>

      <Section title="GET /files/cover-art/ — Cover Art Image">
        <Table
          headers={['Param', 'Required', 'Description']}
          rows={[
            [<Code>path</Code>, 'Yes', 'Audio file path relative to compilation root'],
          ]}
        />
      </Section>

      <Section title="GET /files/download/ — Audio Stream">
        <p className="text-sm text-text-secondary">
          The primary audio streaming endpoint. Supports HTTP Range requests — the browser{' '}
          <Code>{'<audio>'}</Code> element handles seeking automatically when you set <Code>src</Code>.
        </p>
        <Table
          headers={['Param', 'Required', 'Description']}
          rows={[
            [<Code>path</Code>, 'Yes', 'File path relative to compilation root'],
          ]}
        />
        <p className="text-xs text-text-muted font-semibold mt-3">Simple playback:</p>
        <Pre>{`<audio
  controls
  src={\`https://juicewrldapi.com/juicewrld/files/download/?path=\${encodeURIComponent(song.path)}\`}
/>`}</Pre>
        <p className="text-xs text-text-muted font-semibold mt-3">Manual Range request (for custom seeking):</p>
        <Pre>{`fetch(
  \`https://juicewrldapi.com/juicewrld/files/download/?path=\${encodeURIComponent(path)}\`,
  { headers: { Range: 'bytes=0-1048575' } }
)
// Returns 206 Partial Content with Content-Range header`}</Pre>
        <p className="text-xs text-text-muted mt-2">Responses: <Code>200 OK</Code> full file · <Code>206 Partial Content</Code> range</p>
      </Section>

      <Section title="ZIP Operations">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="post">POST</Badge><code className="text-xs font-mono text-text-primary">/start-zip-job/</code></div>
            <p className="text-xs text-text-muted">Start a background ZIP job. Returns a <Code>job_id</Code> for polling.</p>
            <Pre>{`{ "paths": ["Compilation/song1.mp3", "Compilation/song2.mp3"] }`}</Pre>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="get">GET</Badge><code className="text-xs font-mono text-text-primary">/zip-job-status/{'{job_id}'}/ </code></div>
            <p className="text-xs text-text-muted">Poll ZIP job progress.</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="post">POST</Badge><code className="text-xs font-mono text-text-primary">/cancel-zip-job/{'{job_id}'}/ </code></div>
            <p className="text-xs text-text-muted">Cancel an in-progress ZIP job.</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="post">POST</Badge><code className="text-xs font-mono text-text-primary">/files/zip-selection/</code></div>
            <p className="text-xs text-text-muted">Immediate ZIP stream (not background).</p>
            <Pre>{`{ "paths": ["Compilation/Folder"] }`}</Pre>
          </div>
        </div>
      </Section>
    </div>
  )
}

function PlaylistsTab() {
  return (
    <div className="space-y-6">
      <Section title="Shared Playlists (no auth required)">
        <p className="text-sm text-text-secondary">
          Public, anonymous-link playlists. Anyone with the share ID can read them.
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="post">POST</Badge><code className="text-xs font-mono text-text-primary">/playlists/share/</code></div>
            <Pre>{`// Request
{ "paths": ["Compilation/song1.mp3", "Compilation/song2.mp3"] }

// Response
{ "share_id": "abc123..." }`}</Pre>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="get">GET</Badge><code className="text-xs font-mono text-text-primary">/playlists/shared/{'{share_id}'}/ </code></div>
            <p className="text-xs text-text-muted">Full shared playlist with all track metadata.</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="get">GET</Badge><code className="text-xs font-mono text-text-primary">/playlists/shared/{'{share_id}'}/info/</code></div>
            <p className="text-xs text-text-muted">Lightweight preview — name + track count without full fetch.</p>
          </div>
        </div>
      </Section>

      <Section title="Personal Library Playlists (auth required)">
        <p className="text-sm text-text-secondary">
          Private, account-synced playlists. Any logged-in user (including standard accounts) can use these — does not require editor role.
        </p>
        <Table
          headers={['Method', 'Path', 'Description']}
          rows={[
            ['GET', '/library/playlists/', 'List all playlists for logged-in user'],
            ['POST', '/library/playlists/', 'Create a playlist'],
            ['GET', '/library/playlists/{id}/', 'Get playlist with full track list'],
            ['PATCH', '/library/playlists/{id}/', 'Update name, description, cover, or reorder tracks'],
            ['DELETE', '/library/playlists/{id}/', 'Delete a playlist'],
            ['POST', '/library/playlists/{id}/items/', 'Add a track'],
            ['DELETE', '/library/playlists/{id}/items/{song_id}/', 'Remove a track'],
          ]}
        />
        <p className="text-xs text-text-muted font-semibold mt-3">Create:</p>
        <Pre>{`POST /library/playlists/
Authorization: Token <token>

{
  "name": "My Playlist",
  "description": "optional",
  "cover_image": undefined  // optional base64 string
}`}</Pre>
        <p className="text-xs text-text-muted font-semibold mt-3">Update (all fields optional, including track reorder):</p>
        <Pre>{`PATCH /library/playlists/{id}/

{
  "name": "New name",
  "description": "New description",
  "cover_image": "",         // base64, or "" to clear
  "order": [123, 456, 789]  // song IDs in desired order
}`}</Pre>
        <p className="text-xs text-text-muted font-semibold mt-3">List response — each item:</p>
        <Pre>{`{
  "id": 1,
  "name": "My Playlist",
  "description": "optional",
  "cover_image": "...",
  "cover_image_url": "...",  // fallback to first track image_url
  "track_count": 12,
  "created_at": "...",
  "updated_at": "..."
}`}</Pre>
        <p className="text-xs text-text-muted font-semibold mt-3">Detail response — same fields plus <Code>items[]</Code>:</p>
        <Pre>{`{
  "id": 1,
  "name": "My Playlist",
  "items": [
    {
      "id": 501,
      "position": 0,
      "added_at": "...",
      "song": {
        "id": 123, "public_id": 163, "name": "Maze",
        "path": "Compilation/.../Maze.mp3",
        "length": "2:24", "credited_artists": "Juice WRLD",
        "category": "released", "album": "...",
        "image_url": "/assets/drfl.png",
        "era": { /* era object */ },
        "lyrics": "...", "synced_lyrics": "..."
      }
    }
  ]
}`}</Pre>
        <p className="text-xs text-text-muted mt-2">The song object in playlist items is a trimmed shape — no <Code>producers</Code>, <Code>engineers</Code>, or <Code>bitrate</Code>.</p>
      </Section>

      <Section title="Favorites (auth required)">
        <Table
          headers={['Method', 'Path', 'Description']}
          rows={[
            ['GET', '/library/favorites/', 'List favorite tracks'],
            ['POST', '/library/favorites/', 'Add a favorite — body: { song_id }'],
            ['DELETE', '/library/favorites/{song_id}/', 'Remove a favorite'],
          ]}
        />
      </Section>
    </div>
  )
}

function AuthTab() {
  return (
    <div className="space-y-6">
      <Section title="Roles">
        <Table
          headers={['Role', 'role string', 'is_editor', 'is_administrator']}
          rows={[
            ['Standard', <Code>applicant</Code>, '—', '—'],
            ['Editor', <Code>editor</Code>, '✓', '—'],
            ['Admin', <Code>administrator</Code>, '✓', '✓'],
          ]}
        />
        <p className="text-xs text-text-muted mt-2">
          New Discord users start as <Code>applicant</Code>. Editors are promoted after application approval. Admins are assigned manually.
          Admins always have <Code>is_editor: true</Code>.
        </p>
        <p className="text-xs text-text-muted font-semibold mt-3">Attach token to every authenticated request:</p>
        <Pre>{`Authorization: Token YOUR_TOKEN_HERE`}</Pre>
      </Section>

      <Section title="Discord Login (recommended)">
        <ol className="space-y-3 text-sm text-text-secondary list-decimal list-inside">
          <li><code className="text-accent font-mono text-xs">GET /accounts/auth/discord/url/</code> → returns <Code>authorize_url</Code> and <Code>state</Code></li>
          <li>Redirect the user through Discord OAuth using <Code>authorize_url</Code></li>
          <li>Exchange the code Discord returns:</li>
        </ol>
        <Pre>{`POST /accounts/auth/discord/exchange/

{
  "code": "discord_auth_code",
  "state": "state_from_step_1",
  "redirect_uri": "https://your-app.com/callback"
}

// Response includes token + user object`}</Pre>
        <p className="text-xs text-text-muted">Store the token and attach it as <Code>Authorization: Token &lt;token&gt;</Code> on subsequent requests.</p>
      </Section>

      <Section title="Admin Login">
        <p className="text-sm text-text-secondary">Username/password — administrators only. Not needed for a public music player.</p>
        <Pre>{`POST /accounts/login/

{
  "token": "abc123...",
  "profile": { "role": "administrator", "is_editor": true, "is_administrator": true },
  "requires_otp_setup": false
}`}</Pre>
      </Section>

      <Section title="Who Am I — Two Endpoints">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="get">GET</Badge><code className="text-xs font-mono text-text-primary">/accounts/account/me/</code></div>
            <p className="text-xs text-text-muted mb-2">Public-facing. No <Code>role</Code> string — booleans only. Use this for music player UI gating.</p>
            <Pre>{`{
  "id": 42,
  "display_name": "someuser",
  "discord_id": "123456789",
  "discord_username": "someuser",
  "discord_avatar": "https://cdn.discordapp.com/avatars/...",
  "is_editor": false,
  "is_administrator": false,
  "otp_enabled": false
}`}</Pre>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge color="get">GET</Badge><code className="text-xs font-mono text-text-primary">/accounts/me/</code></div>
            <p className="text-xs text-text-muted mb-2">Editor/admin dashboards. Includes raw <Code>role</Code> string and extra stats.</p>
            <Pre>{`{
  "username": "discord_123456789",
  "role": "applicant",
  "is_editor": false,
  "is_administrator": false,
  "is_superuser": false,
  "otp_enabled": false,
  "discord_id": "123456789",
  "discord_username": "someuser",
  "discord_avatar": "https://cdn.discordapp.com/avatars/...",
  "approved_count": 0,
  "badges": []
}`}</Pre>
          </div>
        </div>
      </Section>

      <Section title="Permission Matrix">
        <Table
          headers={['Access Level', 'Endpoints']}
          rows={[
            ['No login', 'Songs, eras, categories, files, radio, stats, shared playlists, play tracking'],
            ['Any logged-in user', '/account/me/, /application/, /library/*'],
            ['Editor or admin', '/me/, /editor/proposals/, /editor/leaderboard/, /badges/'],
            ['Admin only', '/admin/users/, /admin/proposals/, /admin/applications/'],
          ]}
        />
        <p className="text-xs text-text-muted mt-2">
          A 403 response means insufficient role — message text is typically{' '}
          <Code>"Editor access required."</Code> or <Code>"Administrator access required."</Code>.
        </p>
      </Section>

      <Section title="Edit Proposals (Editor+)">
        <Pre>{`POST /accounts/editor/proposals/
Authorization: Token <token>
Content-Type: application/json

{
  "change_type": "update",
  "song": 94086,
  "title": "Song Title",
  "editor_notes": "",
  "proposed_data": {
    "lyrics": "..."
  }
}`}</Pre>
        <Table
          headers={['Field', 'Type', 'Description']}
          rows={[
            [<Code>change_type</Code>, 'string', '"update" (only known value)'],
            [<Code>song</Code>, 'number', 'Internal song ID (song.id, not public_id)'],
            [<Code>title</Code>, 'string', 'Song title for display purposes'],
            [<Code>editor_notes</Code>, 'string', 'Optional notes from the editor'],
            [<Code>proposed_data</Code>, 'object', 'Only the fields being changed'],
          ]}
        />
        <p className="text-xs text-text-muted font-semibold mt-3">Proposal object shape:</p>
        <Pre>{`{
  "id": 167,
  "editor_username": "freakypallet",
  "editor_id": 12,
  "song": 94086,
  "song_public_id": 163,
  "change_type": "update",
  "title": "Song Title",
  "proposed_data": { "lyrics": "..." },
  "original_proposed_data": { "lyrics": "..." },
  "applied_data": {},
  "revised_by_admin": false,
  "original_snapshot": { /* Full song fields at time of proposal */ },
  "editor_notes": "",
  "status": "pending",
  "reviewer_username": null,
  "review_notes": "",
  "edit_count": 0,
  "last_edited_at": null,
  "created_at": "2026-06-16T22:07:24.970047Z",
  "reviewed_at": null
}`}</Pre>
      </Section>

      <Section title="Play Tracking">
        <p className="text-sm text-text-secondary">Record a listen event — no auth required. Call when a track starts (or after e.g. 30 s).</p>
        <Pre>{`POST /juicewrld/plays/`}</Pre>
      </Section>

      <Section title="Admin: User Lookup" defaultOpen={false}>
        <Table
          headers={['Method', 'Path', 'Description']}
          rows={[
            ['GET', '/accounts/admin/users/', 'List all users. Filter: ?role=editor|administrator|applicant'],
            ['GET', '/accounts/admin/users/{user_id}/', 'Single user detail — role, is_active, Discord info, proposal counts, badges'],
          ]}
        />
        <p className="text-xs text-text-muted">Requires admin token (<Code>is_administrator: true</Code>).</p>
      </Section>
    </div>
  )
}

function FetchPatternTab() {
  return (
    <div className="space-y-6">
      <Section title="Fetch Utility">
        <p className="text-sm text-text-secondary">Always use a utility function — never fetch inline in components.</p>
        <Pre>{`// lib/juicewrld.ts
const BASE = 'https://juicewrldapi.com/juicewrld'

export async function apiFetch(
  path: string,
  params: Record<string, string | number | undefined> = {},
  opts: { method?: string; token?: string; body?: unknown } = {}
) {
  const url = new URL(BASE + path)
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, String(v))
  })
  const headers: Record<string, string> = {}
  if (opts.token) headers['Authorization'] = \`Token \${opts.token}\`
  if (opts.body)  headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) throw new Error(\`API error \${res.status}\`)
  return res.json()
}`}</Pre>
      </Section>

      <Section title="React Hook Pattern">
        <Pre>{`// hooks/useSongs.ts
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/juicewrld'

export function useSongs({
  category, era, search, searchall, lyrics,
  page = 1, page_size = 20
} = {}) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    apiFetch('/songs/', { category, era, search, searchall, lyrics, page, page_size })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [category, era, search, searchall, lyrics, page, page_size])

  return { songs: data?.results ?? [], count: data?.count ?? 0, loading, error }
}`}</Pre>
      </Section>

      <Section title="Audio Streaming">
        <Pre>{`// Simple — browser handles range/seeking automatically
<audio
  controls
  src={\`https://juicewrldapi.com/juicewrld/files/download/?path=\${encodeURIComponent(song.path)}\`}
/>

// Tier check before rendering play button
{song.path && (
  <button onClick={() => playSong(song)}>▶</button>
)}`}</Pre>
      </Section>

      <Section title="Tips">
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> Use <Code>song.path</Code> directly as the stream path — it's already in the right format.</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> The browser <Code>{'<audio>'}</Code> element handles Range requests automatically — just set <Code>src</Code>.</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> Debounce search inputs 300–500 ms to avoid hammering the API.</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> <Code>track_titles</Code> is an array — a song may have multiple alternative titles. Show the first or let users pick.</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> Not all songs have a <Code>path</Code> (some are metadata-only). Check before rendering a play button.</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> <Code>image_url</Code> is relative — prepend <Code>https://juicewrldapi.com</Code>.</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> Use <Code>/radio/random/</Code> for a shuffle/discover feature — it already returns a playable file.</li>
          <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> Check <Code>/account/me/</Code> first to know the role — don't probe restricted endpoints and handle 403s.</li>
        </ul>
      </Section>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'songs',     label: 'Songs & Search' },
  { id: 'files',     label: 'Files & Stream' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'auth',      label: 'Auth & Accounts' },
  { id: 'patterns',  label: 'Code Patterns' },
] as const

type TabId = typeof TABS[number]['id']

export default function DocsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--surface)]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0 border-b border-[var(--border)]">
        <div className="flex items-baseline gap-3 mb-4">
          <h1 className="text-text-primary text-xl font-bold">API Docs</h1>
          <span className="text-xs text-text-muted font-mono">juicewrldapi.com</span>
          <a
            href="https://juicewrldapi.com/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
          >
            Open live docs <ExternalLink size={11} />
          </a>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-accent border-accent'
                  : 'text-text-muted border-transparent hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'overview'  && <OverviewTab />}
          {activeTab === 'songs'     && <SongsTab />}
          {activeTab === 'files'     && <FilesTab />}
          {activeTab === 'playlists' && <PlaylistsTab />}
          {activeTab === 'auth'      && <AuthTab />}
          {activeTab === 'patterns'  && <FetchPatternTab />}
        </div>
      </div>
    </div>
  )
}
