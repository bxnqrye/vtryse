import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import LiveMap from './LiveMap'
import type { MapPoint } from './LiveMap'
import { formatDistance, haversineKm } from '../utils/geo'
import type { LiveLocation, Place } from '../hooks/useLiveLocation'

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-soft p-3">
      <p className="g-label mb-2">{title}</p>
      {children}
    </section>
  )
}

// One person on their own map
function PersonMap({
  place,
  name,
  me,
  dark,
  open,
  now,
  extra,
}: {
  place: Place
  name: string
  me: boolean
  dark: boolean
  open: boolean
  now: number
  extra?: string
}) {
  const points = useMemo<MapPoint[]>(
    () => [{ id: me ? 'me' : place.userId, name, lat: place.lat, lon: place.lon, me }],
    [place.userId, place.lat, place.lon, name, me]
  )
  return (
    <>
      <div className="h-52 rounded-xl overflow-hidden border border-(--h-pink)/30 shadow-[0_0_24px_var(--h-glow)]">
        <LiveMap points={points} dark={dark} active={open} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-xs t-muted">
        <span>
          {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
          {place.accuracy !== undefined && ` · ±${Math.round(place.accuracy)} m`}
        </span>
        <span>
          {extra && <b className="text-(--h-pink) mr-2">{extra}</b>}updated {timeAgo(place.updatedAt, now)}
        </span>
      </div>
    </>
  )
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

  const allPoints = useMemo<MapPoint[]>(() => {
    const list: MapPoint[] = []
    if (mine) list.push({ id: 'me', name: 'You', lat: mine.lat, lon: mine.lon, me: true })
    others.forEach((o) =>
      list.push({ id: o.userId, name: people[o.userId]?.name ?? 'Someone', lat: o.lat, lon: o.lon, me: false })
    )
    return list
  }, [mine, others, people])

  const dists = mine
    ? others.map((o) => ({
        o,
        name: people[o.userId]?.name ?? 'Someone',
        km: haversineKm(mine.lat, mine.lon, o.lat, o.lon),
      }))
    : []

  const chip =
    dists.length === 0
      ? mine
        ? 'Waiting for someone else to share…'
        : 'Finding your location…'
      : dists.length === 1
        ? `${formatDistance(dists[0].km)} away from each other`
        : `${formatDistance(Math.min(...dists.map((d) => d.km)))} to the nearest`

  const toggleCard = (
    <div className="glass-soft p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold">Share my live location</p>
        <p className="text-xs t-muted leading-snug">
          Only people on your shared dashboard who also share can see it. Turn it off any time and your
          location is deleted.
        </p>
      </div>
      <button onClick={loc.toggle} className={`btn shrink-0 ${sharing ? 'btn-primary' : 'btn-ghost'}`}>
        {sharing ? 'On' : 'Off'}
      </button>
    </div>
  )

  const errors = (
    <>
      {!loc.supported && <p className="text-sm text-red-600 dark:text-red-400">This browser can't share location.</p>}
      {loc.error && <p className="text-sm text-red-600 dark:text-red-400 leading-snug">{loc.error}</p>}
    </>
  )

  if (!sharing) {
    return (
      <div className="flex flex-col gap-4">
        {toggleCard}
        {errors}
        <p className="text-sm t-muted text-center py-8">
          Turn sharing on to see where you are, where the others are, and how far apart you are.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Distance (compressed map) */}
      <Section title="Distance">
        <div className="relative h-40 rounded-xl overflow-hidden border border-(--h-pink)/30 shadow-[0_0_24px_var(--h-glow)]">
          <LiveMap points={allPoints} dark={dark} active={open} interactive={false} />
          <div className="absolute inset-x-0 bottom-2 z-[1000] flex justify-center px-2 pointer-events-none">
            <span className="glass-soft px-3 py-1 text-sm font-bold text-(--h-pink) [text-shadow:0_0_12px_var(--h-glow)]">
              {chip}
            </span>
          </div>
        </div>
        {dists.length > 1 && (
          <ul className="mt-2 space-y-1 text-sm">
            {dists.map((d) => (
              <li key={d.o.userId} className="flex justify-between">
                <span className="font-semibold truncate">{d.name}</span>
                <span className="font-bold text-(--h-pink) shrink-0">{formatDistance(d.km)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {toggleCard}
      {errors}

      {/* 2. Your location */}
      <Section title="Your location">
        {mine ? (
          <PersonMap place={mine} name="You" me dark={dark} open={open} now={now} />
        ) : (
          <p className="text-sm t-muted py-6 text-center">Finding your location…</p>
        )}
      </Section>

      {/* 3. The other people sharing with you */}
      {others.length === 0 ? (
        <Section title="Others">
          <p className="text-sm t-muted text-center py-4">
            Nobody else is sharing their location right now.
          </p>
        </Section>
      ) : (
        others.map((o) => {
          const km = mine ? haversineKm(mine.lat, mine.lon, o.lat, o.lon) : null
          return (
            <Section key={o.userId} title={people[o.userId]?.name ?? 'Someone'}>
              <PersonMap
                place={o}
                name={people[o.userId]?.name ?? 'Someone'}
                me={false}
                dark={dark}
                open={open}
                now={now}
                extra={km !== null ? `${formatDistance(km)} away` : undefined}
              />
            </Section>
          )
        })
      )}
    </div>
  )
}

export default LocationPanel
