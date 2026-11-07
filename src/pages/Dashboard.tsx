import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import AnalyticsSection from '../components/AnalyticsSection'
import CalendarSection from '../components/CalendarSection'
import GoalPlannerSection from '../components/GoalPlannerSection'
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
      <header className="mb-4">
        <p className="g-label mb-1">Dashboard</p>
        <h1 className="text-2xl font-semibold t-main">
          {name ? `Welcome back, ${name}!` : 'Dashboard'}
        </h1>
      </header>

      <DashboardHeader />

      <div className="flex flex-col gap-4">
        <section className="glass p-5">
          <AnalyticsSection />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <section className="bg:trace/50 shadow-[0_0_24px_rgba(109,87,88,0.5)] bg-trace/20 hover:border-trace glass p-5">
            <CalendarSection />
          </section>
          <section className="glass p-5">
            <GoalPlannerSection />
          </section>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
