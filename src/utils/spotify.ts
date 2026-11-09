import { supabase } from '../supabaseClient'

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined
const SCOPES = 'user-read-currently-playing user-read-recently-played'

export const spotifyConfigured = Boolean(CLIENT_ID)
const redirectUri = () => `${window.location.origin}/spotify-callback`

export interface SpotifyTrack {
  id: string
  name: string
  artists: string
  album: string
  image: string | null
  url: string
  playedAt?: string
}

export interface SpotifyActivity {
  connected: boolean
  isPlaying: boolean
  track: SpotifyTrack | null
  recent: SpotifyTrack[]
  error?: 'forbidden' | 'rate' | 'auth' | 'network' | 'lastfm_user' | 'lastfm_private'
  source?: 'spotify' | 'lastfm'
}

export interface FriendActivity {
  userId: string
  name: string
  avatar: string | null
  live: boolean
  track: SpotifyTrack | null
  updatedAt: string
}

interface RawTrack {
  id: string
  name: string
  artists?: { name: string }[]
  show?: { name: string; publisher?: string }
  album?: { name: string; images?: { url: string }[] }
  images?: { url: string }[]
  external_urls?: { spotify?: string }
}
interface RawRecent {
  track?: RawTrack
  item?: RawTrack // defensive: Spotify renamed some `track` fields to `item` in 2026
  played_at: string
}
interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

/* ---------- PKCE login ---------- */
function randomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

async function challengeFrom(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function startSpotifyLogin() {
  if (!CLIENT_ID) return
  const verifier = randomString(64)
  const state = randomString(16)
  sessionStorage.setItem('spotify_verifier', verifier)
  sessionStorage.setItem('spotify_state', state)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: await challengeFrom(verifier),
    state,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error('spotify_token_error')
  return res.json()
}

async function saveTokens(t: TokenResponse, fallbackRefresh?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not_logged_in')
  const { error } = await supabase.from('spotify_connections').upsert({
    user_id: user.id,
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? fallbackRefresh,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function completeSpotifyLogin(code: string, state: string) {
  const verifier = sessionStorage.getItem('spotify_verifier')
  if (!CLIENT_ID || !verifier || state !== sessionStorage.getItem('spotify_state')) {
    throw new Error('bad_state')
  }
  const t = await tokenRequest(
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    })
  )
  await saveTokens(t)
  sessionStorage.removeItem('spotify_verifier')
  sessionStorage.removeItem('spotify_state')
}

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('spotify_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data) return null

  if (new Date(data.expires_at).getTime() - 60_000 > Date.now()) return data.access_token

  try {
    const t = await tokenRequest(
      new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: data.refresh_token,
      })
    )
    await saveTokens(t, data.refresh_token)
    return t.access_token
  } catch {
    // Refresh token expired / revoked (Spotify refresh tokens last ~6 months): ask to reconnect
    await supabase.from('spotify_connections').delete().eq('user_id', user.id)
    return null
  }
}

/* ---------- Reading Spotify ---------- */
function normalize(raw: RawTrack | null | undefined, playedAt?: string): SpotifyTrack | null {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name,
    artists: raw.artists?.map((a) => a.name).join(', ') ?? raw.show?.publisher ?? '',
    album: raw.album?.name ?? raw.show?.name ?? '',
    image: raw.album?.images?.[0]?.url ?? raw.images?.[0]?.url ?? null,
    url: raw.external_urls?.spotify ?? '',
    playedAt,
  }
}

export async function fetchSpotifyActivity(): Promise<SpotifyActivity> {
  const empty: SpotifyActivity = { connected: false, isPlaying: false, track: null, recent: [], source: 'spotify' }
  const token = await getAccessToken()
  if (!token) return empty

  const headers = { Authorization: `Bearer ${token}` }
  try {
    const [nowRes, recentRes] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers }),
      fetch('https://api.spotify.com/v1/me/player/recently-played?limit=5', { headers }),
    ])
    const base = { ...empty, connected: true }
    if (nowRes.status === 403 || recentRes.status === 403) return { ...base, error: 'forbidden' }
    if (nowRes.status === 429 || recentRes.status === 429) return { ...base, error: 'rate' }
    if (nowRes.status === 401 || recentRes.status === 401) return { ...base, error: 'auth' }

    const now = nowRes.status === 200 ? await nowRes.json() : null
    const recentJson = recentRes.ok ? await recentRes.json() : { items: [] }

    const track = normalize(now?.item)
    const recent = ((recentJson.items ?? []) as RawRecent[])
      .map((it) => normalize(it.track ?? it.item, it.played_at))
      .filter((t): t is SpotifyTrack => t !== null)

    return { ...base, isPlaying: Boolean(now?.is_playing) && track !== null, track, recent }
  } catch {
    return { ...empty, connected: true, error: 'network' }
  }
}

/* ---------- Sharing with your dashboard group ---------- */
export async function saveSpotifyActivity(a: SpotifyActivity) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('spotify_activity').upsert({
    user_id: user.id,
    is_playing: a.isPlaying,
    track: a.track,
    recent: a.recent,
    updated_at: new Date().toISOString(),
  })
}

interface ActivityRow {
  user_id: string
  is_playing: boolean
  track: SpotifyTrack | null
  recent: SpotifyTrack[] | null
  updated_at: string
}

export async function fetchFriendsActivity(): Promise<FriendActivity[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [{ data: acts }, { data: profs }] = await Promise.all([
    supabase
      .from('spotify_activity')
      .select('user_id, is_playing, track, recent, updated_at')
      .neq('user_id', user.id),
    supabase.from('profiles').select('id, name, avatar_url'),
  ])

  const byId = new Map<string, { name: string | null; avatar_url: string | null }>()
  ;(profs ?? []).forEach((p) => byId.set(p.id, p))

  return ((acts ?? []) as ActivityRow[]).map((a) => {
    const fresh = Date.now() - new Date(a.updated_at).getTime() < 90_000
    const live = a.is_playing && fresh && a.track !== null
    return {
      userId: a.user_id,
      name: byId.get(a.user_id)?.name || 'Someone',
      avatar: byId.get(a.user_id)?.avatar_url ?? null,
      live,
      track: live ? a.track : a.recent?.[0] ?? a.track,
      updatedAt: a.updated_at,
    }
  })
}

export async function disconnectSpotify() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('spotify_connections').delete().eq('user_id', user.id)
  await supabase.from('spotify_activity').delete().eq('user_id', user.id)
}

/* ---------- Last.fm (no approval or user limit) ---------- */
const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY as string | undefined
export const lastfmConfigured = Boolean(LASTFM_KEY)
const LF_PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f' // Last.fm's grey "no cover" star

interface LfTrack {
  name: string
  url: string
  artist: { '#text': string }
  album?: { '#text': string }
  image?: { '#text': string; size: string }[]
  date?: { uts: string }
  '@attr'?: { nowplaying?: string }
}

function lfTrack(t: LfTrack): SpotifyTrack {
  const img =
    t.image?.find((i) => i.size === 'extralarge')?.['#text'] ||
    t.image?.[t.image.length - 1]?.['#text'] ||
    ''
  return {
    id: `${t.artist['#text']}-${t.name}`,
    name: t.name,
    artists: t.artist['#text'],
    album: t.album?.['#text'] ?? '',
    image: img && !img.includes(LF_PLACEHOLDER) ? img : null,
    url: t.url,
    playedAt: t.date?.uts ? new Date(Number(t.date.uts) * 1000).toISOString() : undefined,
  }
}

export async function fetchLastfmActivity(username: string): Promise<SpotifyActivity> {
  const base: SpotifyActivity = {
    connected: true,
    isPlaying: false,
    track: null,
    recent: [],
    source: 'lastfm',
  }
  if (!LASTFM_KEY) return { ...base, connected: false }

  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_KEY}&format=json&limit=6`
    )
    const json = await res.json()
    if (json.error) {
      const error = json.error === 6 ? 'lastfm_user' : json.error === 17 ? 'lastfm_private' : json.error === 29 ? 'rate' : 'network'
      return { ...base, error }
    }
    const items = (json.recenttracks?.track ?? []) as LfTrack[]
    const playing = items.find((t) => t['@attr']?.nowplaying === 'true')
    const recent = items
      .filter((t) => t['@attr']?.nowplaying !== 'true')
      .slice(0, 5)
      .map(lfTrack)
    return { ...base, isPlaying: Boolean(playing), track: playing ? lfTrack(playing) : null, recent }
  } catch {
    return { ...base, error: 'network' }
  }
}

export async function getMyLastfmUsername(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('lastfm_username')
    .eq('id', user.id)
    .maybeSingle()
  return data?.lastfm_username ?? null
}

export async function saveLastfmUsername(name: string | null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ lastfm_username: name }).eq('id', user.id)
}

export async function disconnectLastfm() {
  await saveLastfmUsername(null)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await supabase.from('spotify_activity').delete().eq('user_id', user.id)
}
