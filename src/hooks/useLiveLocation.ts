import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export interface Place {
  userId: string
  lat: number
  lon: number
  updatedAt: string
  accuracy?: number
}
export interface Person {
  name: string
  avatar: string | null
}
interface Row {
  user_id: string
  sharing: boolean
  lat: number | null
  lon: number | null
  accuracy: number | null
  updated_at: string
}

function explain(err: GeolocationPositionError): string {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const inApp = /FBAN|FBAV|Instagram|Line\/|Messenger|Snapchat|TikTok/i.test(ua)

  if (err.code === 1) {
    if (inApp) return 'This in-app browser blocks location. Open vtryse in Safari or Chrome and try again.'
    if (ios)
      return 'Location is blocked on this iPhone. Settings → Privacy & Security → Location Services → On, then Safari Websites → While Using the App. In Safari tap aA → Website Settings → Location → Allow. Then reload this page.'
    return 'Location permission was denied. Allow it in your browser’s site settings, then reload and try again.'
  }
  if (err.code === 2)
    return 'Your device could not work out its position. Make sure Location Services is on, then try again.'
  return 'Getting your location timed out. Try again near a window or with a better signal.'
}

export function useLiveLocation() {
  const [meId, setMeId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [mine, setMine] = useState<Place | null>(null)
  const [others, setOthers] = useState<Place[]>([])
  const [people, setPeople] = useState<Record<string, Person>>({})
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  // Load rows + live updates from the people sharing with you
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const [{ data: rows }, { data: profs }] = await Promise.all([
        supabase.from('live_locations').select('user_id, sharing, lat, lon, accuracy, updated_at'),
        supabase.from('profiles').select('id, name, avatar_url'),
      ])
      if (cancelled) return

      const map: Record<string, Person> = {}
      ;(profs ?? []).forEach((p) => {
        map[p.id] = { name: p.name || 'Someone', avatar: p.avatar_url ?? null }
      })
      const list = (rows ?? []) as Row[]
      const me = list.find((r) => r.user_id === user.id)

      setMeId(user.id)
      setPeople(map)
      setSharing(Boolean(me?.sharing))
      setMine((prev) =>
        !me?.sharing
          ? null
          : (prev ??
            (me.lat !== null && me.lon !== null
              ? { userId: user.id, lat: me.lat, lon: me.lon, accuracy: me.accuracy ?? undefined, updatedAt: me.updated_at }
              : null))
      )
      setOthers(
        list
          .filter((r) => r.user_id !== user.id && r.sharing && r.lat !== null && r.lon !== null)
          .map((r) => ({
            userId: r.user_id,
            lat: r.lat as number,
            lon: r.lon as number,
            accuracy: r.accuracy ?? undefined,
            updatedAt: r.updated_at,
          }))
      )
    }

    load()
    const channel = supabase
      .channel('live_locations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => {
        load()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tick])

  // While sharing: follow your GPS and publish it (at most every 10 s)
  useEffect(() => {
    if (!sharing || !meId || !supported) return
    let last = 0
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const t = Date.now()
        if (t - last < 10000) return
        last = t
        const { latitude, longitude, accuracy } = pos.coords
        setError('')
        setMine({ userId: meId, lat: latitude, lon: longitude, accuracy, updatedAt: new Date(t).toISOString() })
        supabase.from('live_locations').upsert({
          user_id: meId,
          sharing: true,
          lat: latitude,
          lon: longitude,
          accuracy,
          updated_at: new Date(t).toISOString(),
        })
      },
      (err) => {
        if (err.code === 1) {
          // Permission was taken away: switch sharing back off
          setSharing(false)
          setMine(null)
          setError(explain(err))
          supabase.from('live_locations').delete().eq('user_id', meId)
        }
        // other errors (timeout, no fix) are temporary: keep trying
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [sharing, meId, supported])

  const toggle = async () => {
    if (!meId) return

    if (sharing) {
      setSharing(false)
      setMine(null)
      setError('')
      await supabase.from('live_locations').delete().eq('user_id', meId)
      setTick((n) => n + 1)
      return
    }

    if (!supported) {
      setError('This browser can’t share location.')
      return
    }
    setError('')

    // Ask for permission right inside the tap: iPhone Safari needs the request to come from a user gesture.
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        (e) => {
          setError(explain(e))
          resolve(null)
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      )
    })
    if (!pos) return

    const t = new Date().toISOString()
    const { latitude, longitude, accuracy } = pos.coords
    setMine({ userId: meId, lat: latitude, lon: longitude, accuracy, updatedAt: t })
    setSharing(true)
    await supabase
      .from('live_locations')
      .upsert({ user_id: meId, sharing: true, lat: latitude, lon: longitude, accuracy, updated_at: t })
    setTick((n) => n + 1)
  }

  return { meId, sharing, toggle, mine, others, people, error, supported }
}

export type LiveLocation = ReturnType<typeof useLiveLocation>
