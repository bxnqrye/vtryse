
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

import AnalyticsSection from '../components/AnalyticsSection'
import CalendarSection from '../components/CalendarSection'
import GoalPlannerSection from '../components/GoalPlannerSection'
import SpotifySection from '../components/SpotifySection'
import TogetherWidget from '../components/TogetherWidget'
import NoteBoard from '../components/NoteBoard'
import DashboardHeader from '../components/DashboardHeader'

function Dashboard() {
  const [name, setName] = useState('')

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
        </div>
      </header>

      {/* Spotify + Together + Notes */}
      <div className="
        grid
        grid-cols-1
        xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)]
        gap-4
        items-start
        mb-4
      ">

        {/* Spotify */}
        <section className="glass p-5 w-full min-w-0 self-start">
          <SpotifySection />
        </section>

        {/* Together Widget */}
        <div className="w-full min-w-0 self-start [&>*]:!w-full [&>*]:!max-w-none">
          <TogetherWidget />
        </div>

        {/* Notes */}
        <div className="w-full min-w-0 self-start [&>*]:!w-full [&>*]:!max-w-none">
          <NoteBoard />
        </div>

      </div>

      {/* Analytics */}
      <div className="flex flex-col gap-4">

        <section className="glass p-5 min-w-0">
          <AnalyticsSection />
        </section>

        {/* Calendar + Goal Planner */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">

          <section className="glass p-5 min-w-0">
            <CalendarSection />
          </section>

          <section className="glass p-5 min-w-0">
            <GoalPlannerSection />
          </section>

        </div>
      </div>

    </div>
  )
}

export default Dashboard