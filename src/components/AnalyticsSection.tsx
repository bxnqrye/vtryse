import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface EventRow {
  id: string
  title: string
  status: string
  event_date: string
  type: string
  attachment_url: string | null
  description: string | null
  color: string
}

interface Goal {
  id: string
  title: string
  target_date: string
}

const STATUS_COLORS: Record<string, string> = {
  ongoing: '#DE9E9E',
  completed: '#77BA68',
  cancelled: '#a33a3a',
}

const TYPE_COLORS: Record<string, string> = {
  event: '#8DBD71',
  task: '#E6D591',
  holiday: '#B0A5A5',
  note: '#E8899A',
}

const tooltipStyle = {
  background: 'var(--g-glass-strong)',
  border: '1px solid var(--g-border)',
  borderRadius: 12,
  color: 'var(--g-text)',
  fontSize: 12,
}

function JournalTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const point = payload[0].payload
  return (
    <div className="g-modal glass !rounded-lg px-2.5 py-1.5 text-xs">
      {point.date} : {point.title}
    </div>
  )
}

function AnalyticsSection() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedNotes, setSelectedNotes] = useState<EventRow[] | null>(null)

  const fetchData = async () => {
    const { data: eventData } = await supabase
      .from('calendar_events')
      .select('id, title, status, event_date, type, attachment_url, description, color')
    setEvents(eventData || [])

    const { data: goalData } = await supabase
      .from('goals')
      .select('id, title, target_date')
      .order('target_date', { ascending: true })
    setGoals(goalData || [])
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('analytics_calendar_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals' },
        () => fetchData()
      )
      .subscribe()

    const handleLocalUpdate = () => fetchData()
    window.addEventListener('calendar-data-changed', handleLocalUpdate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('calendar-data-changed', handleLocalUpdate)
    }
  }, [])

  const statusCounts = ['ongoing', 'completed', 'cancelled'].map((status) => ({
    status,
    count: events.filter((e) => e.status === status).length,
  }))

  const noteEvents = events.filter((e) => e.type === 'note')
  const notesByDate: Record<string, EventRow[]> = {}
  noteEvents.forEach((e) => {
    if (!notesByDate[e.event_date]) notesByDate[e.event_date] = []
    notesByDate[e.event_date].push(e)
  })

  const notePoints = Object.entries(notesByDate).flatMap(([date, notesOnDate]) =>
    notesOnDate.map((note, index) => ({
      x: new Date(date).getTime(),
      y: index + 1,
      date,
      title: note.title,
      color: TYPE_COLORS[note.type] || note.color || '#8b7cf6',
      raw: note,
    }))
  )

  const maxY = Math.max(1, ...notePoints.map((p) => p.y))

  const revealedTitles = selectedStatus
    ? events.filter((e) => e.status === selectedStatus).map((e) => e.title)
    : []

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date()
    const target = new Date(targetDate)
    const diff = Math.ceil((target.getTime() - today.setHours(0, 0, 0, 0)) / 86400000)
    return diff
  }

  return (
    <div>
      <h2 className="font-fuzzy g-label text-center text-[17px]">Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Status chart */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Status</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setChartType('bar')}
                className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`btn btn-sm ${chartType === 'pie' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Pie
              </button>
            </div>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={statusCounts}>
                  <XAxis dataKey="status" stroke="#8b8a99" fontSize={12} />
                  <YAxis stroke="#8b8a99" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--g-text)' }} cursor={{ fill: 'rgba(109,87,88,0.15)' }} />
                  <Bar
                    dataKey="count"
                    cursor="pointer"
                    radius={[6, 6, 0, 0]}
                    onClick={(data: any) => setSelectedStatus(data.status)}
                  >
                    {statusCounts.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={statusCounts}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    stroke="none"
                    label={{ fill: '#8b8a99', fontSize: 11 }}
                    onClick={(data: any) => setSelectedStatus(data.status)}
                    cursor="pointer"
                  >
                    {statusCounts.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--g-text)' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {selectedStatus && (
            <div className="glass-soft mt-3 p-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium capitalize">{selectedStatus} items</p>
                <button onClick={() => setSelectedStatus(null)} className="t-muted hover:t-main text-xs">
                  ✕
                </button>
              </div>
              {revealedTitles.length === 0 ? (
                <p className="text-xs t-muted">No items</p>
              ) : (
                <ul className="text-xs t-muted list-disc list-inside max-h-28 overflow-y-auto">
                  {revealedTitles.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Journal activity */}
        <div className="min-w-0">
          <p className="text-sm font-semibold mb-2 lg:h-[30px] flex items-center">Journal Activity</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(109,87,88,0.35)" />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  }
                  stroke="#8b8a99"
                  fontSize={11}
                />
                <YAxis dataKey="y" type="number" domain={[0, maxY + 1]} hide />
                <Tooltip content={<JournalTooltip />} />
                <Scatter
                  data={notePoints}
                  cursor="pointer"
                  onClick={(data: any) => {
                    setSelectedNotes([data.raw])
                  }}
                >
                  {notePoints.map((point, index) => (
                    <Cell key={index} fill={point.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {selectedNotes && selectedNotes.length > 0 && (
            <div className="glass-soft mt-3 p-3 space-y-3 max-h-64 overflow-y-auto">
              <div className="flex justify-between items-center">
                <p className="text-[11px] t-muted">{selectedNotes[0].event_date}</p>
                <button onClick={() => setSelectedNotes(null)} className="t-muted hover:t-main text-xs">
                  ✕
                </button>
              </div>
              {selectedNotes.map((note) => (
                <div key={note.id} className="border-t g-divider pt-2 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[note.type] || note.color }} />
                    <p className="text-sm font-bold t-accent">{note.title}</p>
                  </div>
                  {note.description && (
                    <p className="text-xs text-justify mt-1 whitespace-pre-wrap">{note.description}</p>
                  )}
                  {note.attachment_url && (
                    <img
                      src={note.attachment_url}
                      alt="attachment"
                      className="max-w-full max-h-48 rounded-lg border g-divider object-contain mt-2"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goal deadlines */}
        <div className="min-w-0">
          <p className="text-sm font-semibold mb-0 lg:h-[30px] flex items-center">Goal Deadlines</p>
          <div className="space-y-1 max-h-52 soft-scroll pr-1">
            {goals.length === 0 && <p className="text-xs t-muted">No goals yet</p>}
            {goals.map((goal) => {
              const days = getDaysRemaining(goal.target_date)
              return (
                <div key={goal.id} className="glass-soft px-3 py-0.5 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-bold t-accent truncate">{goal.title}</span>
                  <span
                    className={`text-[12px] shrink-0 ${days >= 0 ? 't-muted' : 'text-red-600 dark:text-red-400 font-semibold'}`}
                  >
                    {days >= 0 ? `${days} days remaining` : 'Overdue'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsSection
