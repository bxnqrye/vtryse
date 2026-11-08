
import { useEffect, useState } from 'react'

import {
  disconnectSpotify,
  fetchFriendsActivity,
  fetchSpotifyActivity,
  saveSpotifyActivity,
  spotifyConfigured,
  startSpotifyLogin,
} from '../utils/spotify'

import type {
  FriendActivity,
  SpotifyActivity,
  SpotifyTrack,
} from '../utils/spotify'

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

function Art({
  src,
  size,
}: {
  src: string | null
  size: number
}) {
  const style = { width: size, height: size }

  return src ? (
    <img
      src={src}
      alt=""
      style={style}
      className="rounded-lg object-cover shrink-0"
    />
  ) : (
    <div
      style={style}
      className="rounded-lg bg-(--g-hover) shrink-0"
    />
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
    "Your Spotify account isn't on this app's allowed list yet. Send your Spotify email to the vtryse owner, then press Disconnect and Connect again.",
  rate: 'Spotify is busy right now. Retrying shortly.',
  auth: 'Your Spotify session expired. Reconnect below.',
  network: 'Could not reach Spotify. Retrying shortly.',
}

function SpotifySection() {
  const [activity, setActivity] = useState<SpotifyActivity | null>(null)
  const [friends, setFriends] = useState<FriendActivity[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const a = await fetchSpotifyActivity()

      if (cancelled) return

      setActivity(a)
      setNow(Date.now())

      if (a.connected && !a.error) {
        await saveSpotifyActivity(a)
      }

      const f = await fetchFriendsActivity()

      if (!cancelled) {
        setFriends(f)
      }
    }

    load()

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        load()
      }
    }, 20000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const handleDisconnect = async () => {
    await disconnectSpotify()

    setActivity({
      connected: false,
      isPlaying: false,
      track: null,
      recent: [],
    })
  }

  const current: SpotifyTrack | null = activity?.isPlaying
    ? activity.track
    : (activity?.recent[0] ?? null)

  return (
    <div className="w-full min-w-0">
      {/* Spotify Heading */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="ml-4 g-label text-sm">Spotify</h2>

        {activity?.connected && (
          <button
            onClick={handleDisconnect}
            className="btn btn-ghost btn-sm"
          >
            Disconnect
          </button>
        )}
      </div>

      {!spotifyConfigured && (
        <p className="text-sm t-muted">
          Connect to Spotify to enable listening activity.
        </p>
      )}

      {spotifyConfigured && activity && !activity.connected && (
        <div className="glass-soft p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm t-muted">
            Connect to Spotify to show your listening activity.
          </p>

          <button
            onClick={startSpotifyLogin}
            className="btn btn-primary"
          >
            Connect Spotify
          </button>
        </div>
      )}

      {activity?.error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
          {ERRORS[activity.error]}{' '}

          {(activity.error === 'auth' || activity.error === 'forbidden') && (
            <button
              onClick={startSpotifyLogin}
              className="underline"
            >
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

                  <p className="truncate text-sm t-muted">
                    {current.artists}
                  </p>

                  <p className="truncate text-xs t-muted">
                    {current.album}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm t-muted">
                Nothing played yet. Start a song on Spotify.
              </p>
            )}

            {/* Recently Played */}
            {activity.recent.length > 0 && (
              <ul className="mt-3 space-y-2">
                {activity.recent.map((t) => (
                  <li
                    key={`${t.id}-${t.playedAt}`}
                    className="flex items-center gap-3 min-w-0"
                  >
                    <Art src={t.image} size={36} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {t.name}
                      </p>

                      <p className="truncate text-xs t-muted">
                        {t.artists}
                      </p>
                    </div>

                    <span className="text-[11px] t-muted shrink-0">
                      {timeAgo(t.playedAt, now)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Shared Dashboard */}
          <div className="w-full min-w-0">

            <p className="text-sm font-semibold mb-2">
              Shared dashboard
            </p>

            {friends.length === 0 ? (
              <p className="text-xs t-muted">
                Nobody sharing yet, or they haven't connected Spotify.
              </p>
            ) : (
              <ul className="space-y-2">
                {friends.map((f) => (
                  <li
                    key={f.userId}
                    className="glass-soft w-full flex items-center gap-3 p-2.5 min-w-0"
                  >
                    {f.avatar ? (
                      <img
                        src={f.avatar}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-(--g-accent) text-white flex items-center justify-center shrink-0">
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {f.name}
                      </p>

                      <p className="truncate text-xs t-muted">
                        {f.track
                          ? `${f.track.name} · ${f.track.artists}`
                          : 'No recent tracks'}
                      </p>
                    </div>

                    <span className="text-[11px] t-muted shrink-0 flex items-center gap-1">
                      {f.live ? (
                        <Equalizer />
                      ) : (
                        timeAgo(f.updatedAt, now)
                      )}
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