import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

import AnalyticsSection from '../components/AnalyticsSection'
import CalendarSection from '../components/CalendarSection'
import GoalPlannerSection from '../components/GoalPlannerSection'
import SpotifySection from '../components/SpotifySection'
import TogetherWidget from '../components/TogetherWidget'
import NoteBoard from '../components/NoteBoard'
import DashboardHeader from '../components/DashboardHeader'
import SidePanel from '../components/SidePanel'
import GalleryPanel from '../components/GalleryPanel'
import JournalPanel from '../components/JournalPanel'
import LocationPanel from '../components/LocationPanel'
import { useLiveLocation } from '../hooks/useLiveLocation'
import { formatDistance, haversineKm } from '../utils/geo'

type PanelKey = 'gallery' | 'journal' | 'location' | 'calendar' | 'goals'

const LAUNCHERS: { key: PanelKey; icon: string; label: string }[] = [
  { key: 'gallery', icon: '', label: 'Gallery' },
  { key: 'journal', icon: '', label: 'Journal' },
  { key: 'location', icon: '', label: 'Location' },
  { key: 'calendar', icon: '', label: 'Calendar' },
  { key: 'goals', icon: '', label: 'Goal Planner' },
]

function Dashboard() {
  const [name, setName] = useState('')
  const [panel, setPanel] = useState<PanelKey | null>(null)
  const close = useCallback(() => setPanel(null), [])
  const loc = useLiveLocation()

  useEffect(() => {
    const fetchName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()

      if (data?.name) setName(data.name)
    }

    fetchName()
  }, [])

  // Real-time distance to the people who share their location too
  const mine = loc.mine
  const dists = mine ? loc.others.map((o) => haversineKm(mine.lat, mine.lon, o.lat, o.lon)) : []
  const distanceText =
    dists.length === 0
      ? null
      : dists.length === 1
        ? `${formatDistance(dists[0])} away from each other`
        : `${formatDistance(Math.min(...dists))} away from the nearest`

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Dashboard Heading */}
      <header className="mb-4">
        <div className="min-w-0">
          <p className="g-label mb-1">Dashboard</p>

          <h1 className="text-2xl font-semibold t-main mb-3">
            {name ? `Welcome back, ${name}!` : 'Dashboard'}
          </h1>

          <DashboardHeader />

          {/* Five sections */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {LAUNCHERS.map((l) => {
              const glowing = l.key === 'location' && loc.sharing
              return (
                <button
                  key={l.key}
                  onClick={() => setPanel(l.key)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-0 py-0 text-base font-bold transition hover:-translate-y-0.5 ${
                    glowing
                      ? 'glow-pulse bg-(--g-accent) text-white border-white/100'
                      : 'glass-soft hover:bg-(--g-hover)'
                  }`}
                >
                  <span className="text-xl leading-none">{l.icon}</span>
                  {l.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Spotify + Together + Notes */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start mb-4">
        <section className="glass p-5 w-full min-w-0 self-start">
          <SpotifySection />
        </section>

        <div className="w-full min-w-0 self-start [&>*]:!w-full [&>*]:!max-w-none">
          <TogetherWidget distanceText={distanceText} />
        </div>

        <div className="w-full min-w-0 self-start [&>*]:!w-full [&>*]:!max-w-none">
          <NoteBoard />
        </div>
      </div>

      {/* Analytics */}
      <section className="glass p-5 min-w-0">
        <AnalyticsSection />
      </section>

      {/* Slide-over sections (right side) */}
      <SidePanel open={panel === 'gallery'} onClose={close} title="Gallery">
        <GalleryPanel open={panel === 'gallery'} />
      </SidePanel>
 
      <SidePanel open={panel === 'journal'} onClose={close} title="Journal">
        <JournalPanel open={panel === 'journal'} />
      </SidePanel>

      <SidePanel open={panel === 'location'} onClose={close} title="Location" wide>
        <LocationPanel open={panel === 'location'} loc={loc} />
      </SidePanel>

      <SidePanel open={panel === 'calendar'} onClose={close} title="Calendar">
        <CalendarSection />
      </SidePanel>

      <SidePanel open={panel === 'goals'} onClose={close} title="Goal Planner" scroll={false}>
        <GoalPlannerSection />
      </SidePanel>
    </div>
  )
}

export default Dashboard
