import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'
import { type RepeatConfig, summarizeRepeat, generateOccurrenceDates } from './RepeatPopover'
import RepeatModal from './RepeatModal'
import SearchableSelect from './SearchableSelect'
import { ALL_TIMEZONES, getBrowserTimezone } from '../utils/timezone'

interface CalendarEvent {
  id: string
  user_id: string
  type: string
  title: string
  description: string | null
  event_date: string
  event_time: string | null
  status: string
  attachment_url: string | null
  color: string
  location: string | null
  timezone: string | null
  repeat_group_id: string | null
}

const TYPE_COLORS: Record<string, string> = {
  event: '#77BA68',
  task: '#E6CA6E',
  holiday: '#B0A5A5',
  note: '#DE9E9E',
}

const STATUS_STYLES: Record<string, string> = {
  ongoing: 'bg-[#C49D8B] text-black',
  completed: 'bg-[#3f8a52] text-white',
  cancelled: 'bg-[#a33a3a] text-white',
}

const TYPE_OPTIONS = ['event', 'task', 'holiday', 'note']

const DEFAULT_REPEAT: RepeatConfig = {
  type: 'none',
  interval: 1,
  unit: 'week',
  days: [],
  ends: 'never',
  endDate: '',
  occurrences: 5,
}

function formatTime12h(time: string | null) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function CalendarSection() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [profileNames, setProfileNames] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteScopeId, setDeleteScopeId] = useState<string | null>(null)
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('event')
  const [eventTime, setEventTime] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventTimezone, setEventTimezone] = useState(getBrowserTimezone())
  const [file, setFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [uploading, setUploading] = useState(false)

  const [repeatOpen, setRepeatOpen] = useState(false)
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>(DEFAULT_REPEAT)

  const notifyDataChanged = () => {
    window.dispatchEvent(new Event('calendar-data-changed'))
  }

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('calendar_events')
      .select('id, user_id, type, title, description, event_date, event_time, status, attachment_url, color, location, timezone, repeat_group_id')
    setEvents(data || [])
  }

  const fetchProfileNames = async () => {
    const { data } = await supabase.from('profiles').select('id, name')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((p) => {
        map[p.id] = p.name || 'Someone'
      })
      setProfileNames(map)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      fetchEvents()
      fetchProfileNames()
    }
    init()
  }, [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const cells: (string | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  const eventsForDate = (date: string) => events.filter((e) => e.event_date === date)

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .update({ status: newStatus })
      .eq('id', eventId)

    if (error) {
      setErrorMsg(error.message)
    } else {
      fetchEvents()
      notifyDataChanged()
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setEventTime('')
    setType('event')
    setLocation('')
    setEventTimezone(getBrowserTimezone())
    setFile(null)
    setEditingId(null)
    setErrorMsg('')
    setRepeatConfig(DEFAULT_REPEAT)
  }

  const startEditing = (e: CalendarEvent) => {
    setEditingId(e.id)
    setTitle(e.title)
    setType(e.type)
    setEventTime(e.event_time || '')
    setDescription(e.description || '')
    setLocation(e.location || '')
    setEventTimezone(e.timezone || getBrowserTimezone())
    setFile(null)
    setShowForm(true)
  }

  const performDelete = async (eventId: string, scope: 'this' | 'following' | 'all') => {
    const target = events.find((e) => e.id === eventId)
    if (!target) return

    let error = null

    if (scope === 'this' || !target.repeat_group_id) {
      const res = await supabase.from('calendar_events').delete().eq('id', eventId)
      error = res.error
    } else if (scope === 'all') {
      const res = await supabase
        .from('calendar_events')
        .delete()
        .eq('repeat_group_id', target.repeat_group_id)
      error = res.error
    } else if (scope === 'following') {
      const res = await supabase
        .from('calendar_events')
        .delete()
        .eq('repeat_group_id', target.repeat_group_id)
        .gte('event_date', target.event_date)
      error = res.error
    }

    if (error) {
      setErrorMsg(error.message)
    } else {
      fetchEvents()
      notifyDataChanged()
    }
    setConfirmDeleteId(null)
    setDeleteScopeId(null)
  }

  const handleDeleteClick = (eventId: string) => {
    const target = events.find((e) => e.id === eventId)
    if (target?.repeat_group_id) {
      setDeleteScopeId(eventId)
    } else {
      setConfirmDeleteId(eventId)
    }
  }

  const handleSaveEvent = async () => {
    if (!title || !selectedDate) {
      setErrorMsg('Title and date are required')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const color = TYPE_COLORS[type] || '#8b7cf6'

    let attachmentUrl: string | null = null
    if (file) {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, file)
      if (uploadError) {
        setErrorMsg(uploadError.message)
        setUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName)
      attachmentUrl = urlData.publicUrl
      setUploading(false)
    }

    if (editingId) {
      const updatePayload: Partial<CalendarEvent> = {
        type,
        title,
        description,
        event_time: eventTime || null,
        color,
        location: location || null,
        timezone: eventTimezone,
      }
      if (attachmentUrl) updatePayload.attachment_url = attachmentUrl

      const { error } = await supabase
        .from('calendar_events')
        .update(updatePayload)
        .eq('id', editingId)

      if (error) {
        setErrorMsg(error.message)
      } else {
        resetForm()
        setShowForm(false)
        fetchEvents()
        notifyDataChanged()
      }
    } else {
      const dates = generateOccurrenceDates(selectedDate, repeatConfig)
      const repeatGroupId = dates.length > 1 ? crypto.randomUUID() : null

      const rows = dates.map((d) => ({
        user_id: user.id,
        type,
        title,
        description,
        event_date: d,
        event_time: eventTime || null,
        status: 'ongoing',
        attachment_url: attachmentUrl,
        color,
        location: location || null,
        timezone: eventTimezone,
        repeat_group_id: repeatGroupId,
      }))

      const { error } = await supabase.from('calendar_events').insert(rows)

      if (error) {
        setErrorMsg(error.message)
      } else {
        resetForm()
        setShowForm(false)
        fetchEvents()
        notifyDataChanged()
      }
    }
  }

  const monthLabel = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div>
      <h2 className="text-center g-label text-sm mb-0">Calendar</h2>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="btn btn-ghost btn-sm !px-3">‹</button>
        <p className="text-[#3f8a52] text-base font-semibold mb-3">{monthLabel}</p>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="btn btn-ghost btn-sm !px-3">›</button>
      </div>

      <div className="grid grid-cols-7 text-[#3f8a52] text-center text-[10px] font-bold t-muted mb-1.5">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="text-center glass p-2 sm:p-5 grid grid-cols-7 gap-1 sm:gap-1.5 mb-6">
        {cells.map((date, i) => {
          const dayEvents = date ? eventsForDate(date) : []
          return (
            <div
              key={i}
              onClick={() => {
                if (date) {
                  setSelectedDate(date)
                  resetForm()
                  setShowForm(false)
                }
              }}
              className={`min-h-12 sm:min-h-16 rounded-lg text-[10px] p-1 relative
                ${date ? 'g-cell cursor-pointer' : ''}
                ${selectedDate === date ? 'g-cell-selected' : ''}`}
            >
              {date && <span className="t-muted font-medium">{parseInt(date.split('-')[2])}</span>}
              <div className="flex flex-col gap-0.5 mt-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className="relative"
                    onMouseEnter={(ev) => { ev.stopPropagation(); setHoveredEventId(e.id) }}
                    onMouseLeave={() => setHoveredEventId(null)}
                  >
                    <div
                      className="truncate rounded px-1 text-black/80 font-medium"
                      style={{ backgroundColor: TYPE_COLORS[e.type] }}
                    >
                      {e.title}
                    </div>
                    {hoveredEventId === e.id && (
                      <div
                        className="g-modal glass !rounded-md absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 whitespace-nowrap px-2 py-1 text-[11px] font-medium"
                        style={{ borderColor: TYPE_COLORS[e.type] }}
                      >
                        {e.type} - {e.title}
                      </div>
                    )}
                  </div>
                ))}
                {dayEvents.length > 2 && <span className="t-muted">+{dayEvents.length - 2}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <div className="glass-soft p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold">{selectedDate}</p>
            <button onClick={() => { setSelectedDate(null); resetForm(); setShowForm(false) }} className="t-muted hover:text-(--g-danger) text-xs">✕</button>
          </div>

          <ul className="space-y-3 mb-3">
            {eventsForDate(selectedDate).map((e) => {
              const isOwner = e.user_id === currentUserId
              const timeLabel = formatTime12h(e.event_time)
              const typeColor = TYPE_COLORS[e.type] || e.color

              return (
                <li key={e.id} className="text-[13px] flex flex-col gap-1 border-b g-divider pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-black/80"
                        style={{ backgroundColor: typeColor }}
                      >
                        {e.type}
                      </span>
                      <span className="truncate font-bold">{e.title}</span>
                      {e.repeat_group_id && (
                        <span className="shrink-0" title="Repeating event">🔁</span>
                      )}
                      {e.attachment_url && (
                        <a href={e.attachment_url} target="_blank" rel="noopener noreferrer" className="shrink-0 t-accent underline text-xs">
                          file
                        </a>
                      )}
                    </div>
                    {isOwner && (
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => startEditing(e)} className="btn btn-ghost btn-sm">Edit</button>
                        <button onClick={() => handleDeleteClick(e.id)} className="btn btn-ghost btn-sm !text-(--g-danger)">Delete</button>
                      </div>
                    )}
                  </div>

                  {timeLabel && (
                    <p className="text-[11px] t-muted">
                      {timeLabel} {e.timezone && `(${e.timezone})`}
                    </p>
                  )}
                  {e.location && (
                    <p className="text-[12px] t-muted">📍 {e.location}</p>
                  )}

                  <p className="text-[11px] t-muted">
                    Added by {profileNames[e.user_id] || 'Someone'}
                  </p>

                  {e.type !== 'note' && e.type !== 'holiday' && (
                    <div className="flex gap-1 mt-0.5">
                      {['ongoing', 'completed', 'cancelled'].map((s) => (
                        <button
                          key={s}
                          onClick={() => isOwner && handleStatusChange(e.id, s)}
                          disabled={!isOwner}
                          className={`px-3 py-1 rounded-md text-[10px] capitalize transition-colors ${
                            e.status === s
                              ? STATUS_STYLES[s]
                              : 't-muted hover:bg-(--g-hover)'
                          } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <button
            onClick={() => setShowForm(true)}
            className="w-full text-left font-semibold text-[11px] tracking-widest t-accent hover:opacity-80 flex items-center mb-2"
          >
            + ADD NEW
          </button>

          <Modal
            open={showForm}
            onClose={() => { resetForm(); setShowForm(false) }}
            className="max-w-xl"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">{editingId ? 'Edit' : `New on ${selectedDate}`}</p>
                <button
                  onClick={() => { resetForm(); setShowForm(false) }}
                  className="t-muted hover:text-(--g-danger) text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-1.5">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className="flex-1 px-2 py-1 rounded-lg font-semibold text-[12px] border transition-colors"
                    style={{
                      backgroundColor: type === t ? TYPE_COLORS[t] : 'transparent',
                      borderColor: TYPE_COLORS[t],
                      color: type === t ? 'black' : TYPE_COLORS[t],
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input !font-bold !text-[13px]"
                style={{ borderColor: TYPE_COLORS[type] }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="glass-input"
                />
                <SearchableSelect
                  options={ALL_TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
                  value={eventTimezone}
                  onChange={setEventTimezone}
                  placeholder="Search timezone..."
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="glass-input"
                />
              </div>

              <button
                type="button"
                onClick={() => setRepeatOpen(true)}
                className="glass-input text-left hover:bg-(--g-hover)"
              >
                {summarizeRepeat(repeatConfig)}
              </button>

              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="glass-input text-justify resize-y min-h-[110px] leading-relaxed"
              />
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="g-file" />
              <div className="flex gap-2">
                <button onClick={handleSaveEvent} disabled={uploading} className="btn btn-primary">
                  {uploading ? 'Uploading...' : editingId ? 'Save Changes' : 'Add'}
                </button>
                <button onClick={() => { resetForm(); setShowForm(false) }} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
              {errorMsg && <p className="text-red-600 dark:text-red-400 text-xs">{errorMsg}</p>}
            </div>
          </Modal>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this event?"
        message="This action cannot be undone."
        onConfirm={() => confirmDeleteId && performDelete(confirmDeleteId, 'this')}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <Modal open={deleteScopeId !== null} onClose={() => setDeleteScopeId(null)}>
        <p className="text-sm font-semibold mb-1">Delete repeating event</p>
        <p className="text-xs t-muted mb-5">This event repeats. Which occurrences do you want to delete?</p>

        <div className="flex flex-col gap-2 mb-4">
          <button
            onClick={() => deleteScopeId && performDelete(deleteScopeId, 'this')}
            className="btn btn-ghost !justify-start"
          >
            This event
          </button>
          <button
            onClick={() => deleteScopeId && performDelete(deleteScopeId, 'following')}
            className="btn btn-ghost !justify-start"
          >
            This and following events
          </button>
          <button
            onClick={() => deleteScopeId && performDelete(deleteScopeId, 'all')}
            className="btn btn-ghost !justify-start"
          >
            All events
          </button>
        </div>

        <div className="flex justify-end">
          <button onClick={() => setDeleteScopeId(null)} className="btn btn-ghost btn-sm">
            Cancel
          </button>
        </div>
      </Modal>

      <RepeatModal
        open={repeatOpen}
        config={repeatConfig}
        onChange={setRepeatConfig}
        onClose={() => setRepeatOpen(false)}
      />
    </div>
  )
}

export default CalendarSection
