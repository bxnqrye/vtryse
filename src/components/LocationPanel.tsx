import { useEffect, useMemo, useState } from 'react'
import LiveMap from './LiveMap'
import type { MapPoint } from './LiveMap'
import { formatDistance, haversineKm } from '../utils/geo'
import type { LiveLocation } from '../hooks/useLiveLocation'

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

function LocationPanel({ open, loc }: { open: boolean; loc: LiveLocation }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => {
      obs.disconnect()
      clearInterval(timer)
    }
  }, [])

  const { mine, others, people, sharing } = loc

  const points = useMemo<MapPoint[]>(() => {
    const list: MapPoint[] = []
    if (mine) list.push({ id: 'me', name: 'You', lat: mine.lat, lon: mine.lon, me: true })
    others.forEach((o) =>
      list.push({ id: o.userId, name: people[o.userId]?.name ?? 'Someone', lat: o.lat, lon: o.lon, me: false })
    )
    return list
  }, [mine, others, people])

  const distances = mine
    ? others.map((o) => ({
        o,
        name: people[o.userId]?.name ?? 'Someone',
        km: haversineKm(mine.lat, mine.lon, o.lat, o.lon),
      }))
    : []

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-soft p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">Share my live location</p>
          <p className="text-xs t-muted leading-snug">
            Only people on your shared dashboard who also share can see it. Turn it off any time and your
            location is deleted.
          </p>
        </div>
        <button
          onClick={loc.toggle}
          className={`btn shrink-0 ${sharing ? 'btn-primary' : 'btn-ghost'}`}
        >
          {sharing ? 'On' : 'Off'}
        </button>
      </div>

      {!loc.supported && (
        <p className="text-sm text-red-600 dark:text-red-400">This browser can't share location.</p>
      )}
      {loc.error && <p className="text-sm text-red-600 dark:text-red-400">{loc.error}</p>}

      {!sharing ? (
        <p className="text-sm t-muted text-center py-10">
          Turn sharing on to see the map, where you are, and where the others are.
        </p>
      ) : (
        <>
          <div className="relative h-[50vh] min-h-72 rounded-2xl overflow-hidden border border-(--h-pink)/30 shadow-[0_0_30px_var(--h-glow)]">
            <LiveMap points={points} dark={dark} active={open} />
            {!mine && (
              <p className="absolute left-3 bottom-3 z-[500] glass-soft px-3 py-1 text-xs">
                Finding your location…
              </p>
            )}
          </div>

          {mine && others.length === 0 && (
            <p className="text-sm t-muted text-center">
              Waiting for someone else to share their location too.
            </p>
          )}

          {distances.length === 1 && (
            <p className="text-center text-2xl font-bold text-(--h-pink) [text-shadow:0_0_18px_var(--h-glow)]">
              {formatDistance(distances[0].km)} away from each other
            </p>
          )}

          {(mine || distances.length > 0) && (
            <ul className="space-y-2">
              {mine && (
                <li className="glass-soft p-3 flex items-center justify-between text-sm">
                  <span className="font-semibold">You</span>
                  <span className="t-muted text-xs">updated {timeAgo(mine.updatedAt, now)}</span>
                </li>
              )}
              {distances.map((d) => (
                <li key={d.o.userId} className="glass-soft p-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold truncate">{d.name}</span>
                  <span className="text-right shrink-0">
                    <span className="block font-bold text-(--h-pink)">{formatDistance(d.km)} away</span>
                    <span className="t-muted text-xs">updated {timeAgo(d.o.updatedAt, now)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default LocationPanel
