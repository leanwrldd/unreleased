// Discord Rich Presence — shows what's playing in the user's Discord status.
//
// Uses @xhayper/discord-rpc (the maintained successor to Discord's archived
// `discord-rpc` package), which talks to the local Discord client over its
// IPC pipe. No OAuth/login is needed for this — `client.login()` with no
// scopes just opens the local connection.
//
// Connection is resilient on purpose: the desktop Discord client may not be
// running yet (or may restart) independently of this app, so failures here
// are expected and silently retried rather than surfaced as errors.

const { Client } = require('@xhayper/discord-rpc')
const { ActivityType } = require('discord-api-types/v10')

const CLIENT_ID = '1521540582558924902'
const RECONNECT_MS = 15000
// Key of the image uploaded under Discord Developer Portal -> your app ->
// Rich Presence -> Art Assets. Per-track album art isn't used here — classic
// RPC (local IPC, not the Activities/embedded-apps API) only accepts
// pre-uploaded asset keys, not arbitrary per-track URLs.
const LARGE_IMAGE_KEY = 'logo'

let client = null
let connected = false
let reconnectTimer = null
let enabled = false
// Last requested presence op, applied once a connection is ready. Replaces
// itself on every call, so only the latest state is ever sent.
let pendingOp = null // { clear: true } | { clear: false, activity }

function clearReconnectTimer() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
}

function scheduleReconnect() {
  if (!enabled || reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, RECONNECT_MS)
}

function createClient() {
  const c = new Client({ clientId: CLIENT_ID })
  c.on('ready', () => {
    connected = true
    if (pendingOp) { const op = pendingOp; pendingOp = null; applyOp(op) }
  })
  c.on('disconnected', () => {
    connected = false
    scheduleReconnect()
  })
  return c
}

async function connect() {
  if (!enabled || connected) return
  if (!client) client = createClient()
  try {
    await client.login()
  } catch {
    // Discord not running, or pipe unavailable — retry later, no error surfaced.
    scheduleReconnect()
  }
}

async function applyOp(op) {
  if (!connected || !client?.user) { pendingOp = op; return }
  try {
    if (op.clear) {
      await client.user.clearActivity()
      return
    }
    // Discord's client can retain the previous activity's start/end
    // timestamps when a later SET_ACTIVITY simply omits them, instead of
    // fully replacing — observed as a paused track showing its elapsed
    // timer keep ticking up (looking like the song had just restarted).
    // Force a real reset first whenever this update has no timestamps.
    if (op.activity.startTimestamp == null && op.activity.endTimestamp == null) {
      await client.user.clearActivity().catch(() => {})
    }
    await client.user.setActivity(op.activity)
  } catch {
    // Activity updates can race a disconnect — ignore, next call will retry.
  }
}

function setEnabled(value) {
  if (value === enabled) return
  enabled = value
  if (value) {
    connect()
  } else {
    clearReconnectTimer()
    pendingOp = null
    if (client) {
      const old = client
      client = null
      connected = false
      old.user?.clearActivity().catch(() => {}).finally(() => old.destroy().catch(() => {}))
    }
  }
}

function setActivity(activity) {
  if (!enabled) return
  applyOp({ clear: false, activity })
}

function clearActivity() {
  if (!enabled) return
  applyOp({ clear: true })
}

/**
 * Build and apply a Rich Presence activity from app-domain "now playing"
 * facts. Keeps Discord's activity shape (timestamps, image keys, ActivityType)
 * out of the renderer — it only needs to report what's playing.
 *
 * @param {{ title: string, artist?: string, isPlaying: boolean, currentTime: number, duration: number, isRadio?: boolean }} info
 */
function setNowPlaying(info) {
  if (!enabled) return
  if (!info || !info.title) { clearActivity(); return }

  const activity = {
    type: ActivityType.Listening,
    details: info.title,
    state: info.artist || undefined,
    largeImageKey: LARGE_IMAGE_KEY,
    largeImageText: info.isRadio ? '999 FM' : 'Unreleased',
    instance: false,
  }

  // Timestamps drive Discord's own live progress bar — only set while
  // actually playing, and only when we have a real duration to anchor to,
  // so we don't need to keep re-sending updates every second.
  if (info.isPlaying && info.duration > 0) {
    const startMs = Date.now() - Math.max(0, info.currentTime) * 1000
    activity.startTimestamp = startMs
    activity.endTimestamp = startMs + info.duration * 1000
  } else {
    activity.details = `${info.title} (paused)`
  }

  setActivity(activity)
}

module.exports = { setEnabled, setActivity, clearActivity, setNowPlaying }
