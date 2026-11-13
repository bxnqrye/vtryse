import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapPoint {
  id: string
  name: string
  lat: number
  lon: number
  me: boolean
}

interface Props {
  points: MapPoint[]
  dark: boolean
  active: boolean
  interactive?: boolean
}

function makeIcon(me: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="loc-pulse ${me ? 'loc-me' : ''}"><span class="loc-ring"></span><span class="loc-ring loc-ring2"></span><span class="loc-dot"></span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function LiveMap({ points, dark, active, interactive = true }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const group = useRef<L.LayerGroup | null>(null)
  const markers = useRef<Map<string, L.Marker>>(new Map())
  const fitted = useRef('')

  // Create the map once
  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, {
      zoomControl: false,
      // one-finger drag is off on phones so the panel can still be scrolled past the map
      dragging: interactive && !L.Browser.mobile,
      scrollWheelZoom: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: false,
      keyboard: false,
    }).setView([14.6, 121], 4)
    if (interactive) L.control.zoom({ position: 'bottomleft' }).addTo(m)
    group.current = L.layerGroup().addTo(m)
    map.current = m
    const store = markers.current
    return () => {
      m.remove()
      map.current = null
      group.current = null
      store.clear()
      fitted.current = ''
    }
  }, [interactive])

  // OpenStreetMap tiles: free, no API key. Dark mode is done with a CSS filter (.map-dark in index.css).
  useEffect(() => {
    const m = map.current
    if (!m) return
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(m)
    return () => {
      tiles.remove()
    }
  }, [])

  // Re-measure when the panel finishes sliding in
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => map.current?.invalidateSize(), 350)
    return () => clearTimeout(t)
  }, [active])

  // Markers + connection lines
  useEffect(() => {
    const m = map.current
    const g = group.current
    if (!m || !g) return
    const store = markers.current

    const ids = new Set(points.map((p) => p.id))
    store.forEach((marker, id) => {
      if (!ids.has(id)) {
        marker.remove()
        store.delete(id)
      }
    })

    points.forEach((p) => {
      const existing = store.get(p.id)
      if (existing) {
        existing.setLatLng([p.lat, p.lon])
        return
      }
      const label = document.createElement('span')
      label.textContent = p.me ? 'You' : p.name // textContent: names are never parsed as HTML
      const marker = L.marker([p.lat, p.lon], { icon: makeIcon(p.me), keyboard: false })
        .bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -14], className: 'loc-tip' })
        .addTo(m)
      store.set(p.id, marker)
    })

    g.clearLayers()
    const me = points.find((p) => p.me)
    if (me) {
      points
        .filter((p) => !p.me)
        .forEach((p) =>
          L.polyline(
            [
              [me.lat, me.lon],
              [p.lat, p.lon],
            ],
            { color: '#e58a9b', weight: 2, dashArray: '6 8', opacity: 0.8 }
          ).addTo(g)
        )
    }

    // Frame everyone once per set of people
    const key = points
      .map((p) => p.id)
      .sort()
      .join(',')
    if (key && key !== fitted.current) {
      fitted.current = key
      if (points.length === 1) m.setView([points[0].lat, points[0].lon], 15)
      else m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number])), { padding: [60, 60], maxZoom: 16 })
    }
  }, [points])

  return <div ref={el} className={`h-full w-full ${dark ? 'map-dark' : ''}`} />
}

export default LiveMap
