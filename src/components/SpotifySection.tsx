import { useEffect, useState } from 'react'
import {
  disconnectLastfm,
  disconnectSpotify,
  fetchFriendsActivity,
  fetchLastfmActivity,
  fetchSpotifyActivity,
  getMyLastfmUsername,
  lastfmConfigured,
  saveLastfmUsername,
  saveSpotifyActivity,
  spotifyConfigured,
  startSpotifyLogin,
} from '../utils/spotify'
import type { FriendActivity, SpotifyActivity, SpotifyTrack } from '../utils/spotify'
import { onEnter } from '../utils/keys'

function timeAgo(iso: string | undefined, now: number) {
  if (!iso) return ''
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function Art({ src, size }: { src: string | null; size: number }) {
  const style = { width: size, height: size }
  return src ? (
    <img src={src} alt="" style={style} className="rounded-lg object-cover shrink-0" />
  ) : (
    <div style={style} className="rounded-lg bg-(--g-hover) shrink-0" />
  )
}

function Equalizer() {
  return (
    <span className="inline-flex items-end gap-[2px] h-3">
      {[0, 0.2, 0.4].map((d) => (
        <span
          key={d}
          className="w-[3px] h-full rounded-sm bg-(--h-pink) animate-pulse"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </span>
  )
}

const ERRORS: Record<string, string> = {
  forbidden:
    "Your Spotify account isn't on this app's allowed list. Use Last.fm to connect your Spotify listening activities in this dashboard.",
  rate: 'Too many requests right now. Retrying shortly.',
  auth: 'Your Spotify session expired. Reconnect below.',
  network: 'Could not reach the music service. Retrying shortly.',
  lastfm_user: 'Last.fm user not found. Press Disconnect and check the username.',
  lastfm_private:
    'Last.fm is hiding your recent listening. In Last.fm go to Settings → Privacy and turn off "Hide recent listening information".',
}

function SpotifySection() {
  const [activity, setActivity] = useState<SpotifyActivity | null>(null)
  const [friends, setFriends] = useState<FriendActivity[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [lfInput, setLfInput] = useState('')
  const [tick, setTick] = useState(0) // bump to reload immediately

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const lf = await getMyLastfmUsername()
      let a = await fetchSpotifyActivity()
      // No Spotify connection (or Spotify blocked this account): fall back to Last.fm
      if ((!a.connected || a.error === 'forbidden') && lf) a = await fetchLastfmActivity(lf)

      if (cancelled) return
      setActivity(a)
      setNow(Date.now())

      if (a.connected && !a.error) await saveSpotifyActivity(a)
      const f = await fetchFriendsActivity()
      if (!cancelled) setFriends(f)
    }

    load()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 20000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [tick])

  const handleDisconnect = async () => {
    if (activity?.source === 'lastfm') await disconnectLastfm()
    else await disconnectSpotify()
    setActivity({ connected: false, isPlaying: false, track: null, recent: [] })
    setTick((t) => t + 1)
  }

  const handleLastfmSave = async () => {
    const name = lfInput.trim()
    if (!name) return
    await saveLastfmUsername(name)
    setLfInput('')
    setTick((t) => t + 1)
  }

  const current: SpotifyTrack | null = activity?.isPlaying
    ? activity.track
    : (activity?.recent[0] ?? null)

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between mb-1">
        <h2 className="ml-4 g-label text-sm">
          Spotify{activity?.source === 'lastfm' ? ' · via Last.fm' : ''}
        </h2>

        {activity?.connected && (
          <button onClick={handleDisconnect} className="btn btn-ghost btn-sm">
            Disconnect
          </button>
        )}
      </div>

      {!spotifyConfigured && !lastfmConfigured && (
        <p className="text-sm t-muted">
          No Spotify or Last.fm connection configured.
        </p>
      )}

      {(spotifyConfigured || lastfmConfigured) && activity && !activity.connected && (
        <div className="glass-soft p-4">
          {spotifyConfigured && (
            <div className="flex flex-wrap items-center justify-between">
              <p className="text-sm t-muted">Connect Spotify to show your listening activity.</p>
              <button onClick={startSpotifyLogin} className="btn btn-primary">
                Connect Spotify
              </button>
            </div>
          )}

          {lastfmConfigured && (
            <div>
              <p className="text-sm t-muted mb-4">
                {spotifyConfigured ? 'Or use ' : 'Use '}Last.fm (works for anyone who scrobbles Spotify):
              </p>
              <div className="flex gap-2" onKeyDown={onEnter(handleLastfmSave)}>
                <input
                  type="text"
                  placeholder="Last.fm username"
                  value={lfInput}
                  onChange={(e) => setLfInput(e.target.value)}
                  className="glass-input flex-1 min-w-0"
                />
                <button onClick={handleLastfmSave} className="btn btn-primary shrink-0">
                  Connect
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activity?.error && (
        <p className="text-sm text-red-600 dark:text-red-400 ml-3 mt-4">
          {ERRORS[activity.error]}{' '}
          {activity.error === 'auth' && (
            <button onClick={startSpotifyLogin} className="underline">
              Reconnect
            </button>
          )}
        </p>
      )}

      {activity?.connected && !activity.error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Listening Now + Recent Tracks */}
          <div className="w-full min-w-0">
            {current ? (
              <div className="glass-soft w-full flex items-center gap-3 p-2">
                <Art src={current.image} size={64} />

                <div className="min-w-0 flex-1">
                  <p className="g-label flex items-center gap-2">
                    {activity.isPlaying ? (
                      <>
                        <Equalizer />
                        Listening now
                      </>
                    ) : (
                      'Last played'
                    )}
                  </p>

                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-base font-bold hover:underline"
                  >
                    {current.name}
                  </a>

                  <p className="truncate text-sm t-muted">{current.artists}</p>
                  <p className="truncate text-xs t-muted">{current.album}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm t-muted">Nothing played yet. Start a song on Spotify.</p>
            )}

            {activity.recent.length > 0 && (
              <ul className="mt-3 space-y-2">
                {activity.recent.map((t) => (
                  <li key={`${t.id}-${t.playedAt}`} className="flex items-center gap-3 min-w-0">
                    <Art src={t.image} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.name}</p>
                      <p className="truncate text-xs t-muted">{t.artists}</p>
                    </div>
                    <span className="text-[11px] t-muted shrink-0">{timeAgo(t.playedAt, now)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Shared Dashboard */}
          <div className="w-full min-w-0">
            <p className="text-sm font-semibold mb-2">Shared dashboard</p>

            {friends.length === 0 ? (
              <p className="text-xs t-muted">
                Nobody is sharing yet, or they haven't connected Last.fm.
              </p>
            ) : (
              <ul className="space-y-2">
                {friends.map((f) => (
                  <li
                    key={f.userId}
                    className="glass-soft w-full flex items-center gap-3 p-2.5 min-w-0"
                  >
                    {f.avatar ? (
                      <img src={f.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-(--g-accent) text-white flex items-center justify-center shrink-0">
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{f.name}</p>
                      <p className="truncate text-xs t-muted">
                        {f.track ? `${f.track.name} · ${f.track.artists}` : 'No recent tracks'}
                      </p>
                    </div>

                    <span className="text-[11px] t-muted shrink-0 flex items-center gap-1">
                      {f.live ? <Equalizer /> : timeAgo(f.updatedAt, now)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpotifySection
