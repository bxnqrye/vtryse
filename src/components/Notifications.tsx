import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

interface Reminder {
  id: string
  title: string
  event_date: string
  event_time: string | null
  type: string
  description: string | null
  attachment_url: string | null
}

const TYPE_COLORS: Record<string, string> = {
  event: '#77BA68',
  task: '#E6CA6E',
  holiday: '#B0A5A5',
  note: '#DE9E9E',
}

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window

function getLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function Notifications() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const notifiedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (canNotify() && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const checkUpcoming = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const today = new Date()
      const tomorrow = new Date()
      tomorrow.setDate(today.getDate() + 1)

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, event_date, event_time, type, description, attachment_url')
        .in('event_date', [getLocalDateString(today), getLocalDateString(tomorrow)])
        .eq('status', 'ongoing')

      if (cancelled || error || !data) return

      data.forEach((reminder) => {
        if (!notifiedIds.current.has(reminder.id) && canNotify() && Notification.permission === 'granted') {
          new Notification(`[${reminder.type}] ${reminder.title}`, {
            body: `Due: ${reminder.event_date}${reminder.event_time ? ' at ' + reminder.event_time : ''}`,
            icon: '/VTryse_logo.png',
          })
          notifiedIds.current.add(reminder.id)
        }
      })
      setReminders(data)
    }

    checkUpcoming()

    const channel = supabase
      .channel('calendar_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => {
        checkUpcoming()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDismiss = (id: string) => {
    setDismissed([...dismissed, id])
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const visibleReminders = reminders.filter((r) => !dismissed.includes(r.id))

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <p className="g-label text-xs hover:bg-(--g-hover) rounded font-semibold text-center bg-[#6d5758]/20 px-1 mb-2">R E M I N D E R S</p>

      {visibleReminders.length === 0 ? (
        <p className="text-xs t-muted px-1">Nothing due soon</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleReminders.map((reminder) => {
            const isExpanded = expandedId === reminder.id
            const titleColor = TYPE_COLORS[reminder.type] || '#8b7cf6'
            return (
              <div
                key={reminder.id}
                onMouseEnter={() => setExpandedId(reminder.id)}
                onMouseLeave={() => setExpandedId(null)}
                onClick={() => toggleExpand(reminder.id)}
                className="glass-soft px-3 py-2 cursor-pointer transition-all duration-300 ease-in-out hover:bg-(--g-hover)"
                style={{ borderLeft: `3px solid ${titleColor}` }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold transition-all duration-300 ${
                        isExpanded ? 'whitespace-normal break-words' : 'truncate'
                      }`}
                      style={{ color: titleColor }}
                    >
                      [{reminder.type}] {reminder.title}
                    </p>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <p className="text-[10px] font-bold t-muted">
                        {reminder.event_date}
                        {reminder.event_time && ` at ${reminder.event_time}`}
                      </p>
                      {reminder.description && (
                        <p className="text-[11px] t-main mt-1 whitespace-pre-wrap break-words">
                          {reminder.description}
                        </p>
                      )}
                      {reminder.attachment_url && (
                        <img
                          src={reminder.attachment_url}
                          alt="attachment"
                          className="max-w-full max-h-32 rounded-lg border g-divider object-contain mt-2"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                    </div>

                    {!isExpanded && (
                      <p className="text-[11px] t-muted truncate">
                        {reminder.event_date}
                        {reminder.event_time && ` at ${reminder.event_time}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDismiss(reminder.id)
                    }}
                    className="t-muted hover:t-main text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Notifications
