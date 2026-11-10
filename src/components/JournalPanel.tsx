import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

interface Note {
  id: string
  user_id: string
  title: string
  description: string | null
  event_date: string
  attachment_url: string | null
}

function JournalPanel({ open }: { open: boolean }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [meId, setMeId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data }, { data: profs }] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('id, user_id, title, description, event_date, attachment_url')
          .eq('type', 'note')
          .order('event_date', { ascending: false }),
        supabase.from('profiles').select('id, name'),
      ])
      if (cancelled) return
      setMeId(user?.id ?? null)
      setNotes((data ?? []) as Note[])
      const map: Record<string, string> = {}
      ;(profs ?? []).forEach((p) => {
        map[p.id] = p.name || 'Someone'
      })
      setNames(map)
    }

    load()
    window.addEventListener('calendar-data-changed', load)
    return () => {
      cancelled = true
      window.removeEventListener('calendar-data-changed', load)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const shown = notes.filter(
    (n) => !q || n.title.toLowerCase().includes(q) || (n.description ?? '').toLowerCase().includes(q)
  )

  const groups: { label: string; list: Note[] }[] = []
  shown.forEach((n) => {
    const label = new Date(n.event_date + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.list.push(n)
    else groups.push({ label, list: [n] })
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          placeholder="Search your journal…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="glass-input flex-1 min-w-0"
        />
        <span className="text-xs t-muted shrink-0">{shown.length} entries</span>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm t-muted text-center py-10">
          No journal entries yet. Add a calendar item of type “note”.
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.label} className="mb-4">
            <p className="g-label mb-2">{g.label}</p>
            <ul className="space-y-2">
              {g.list.map((n) => (
                <li key={n.id} className="glass-soft p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold t-accent">{n.title}</p>
                    <span className="text-[11px] t-muted shrink-0">{n.event_date}</span>
                  </div>
                  {n.user_id !== meId && (
                    <p className="text-[11px] t-muted">by {names[n.user_id] || 'Someone'}</p>
                  )}
                  {n.description && (
                    <p className="mt-1 text-sm whitespace-pre-wrap break-words">{n.description}</p>
                  )}
                  {n.attachment_url && (
                    <img
                      src={n.attachment_url}
                      alt=""
                      loading="lazy"
                      className="mt-2 max-h-48 rounded-lg border border-(--g-border) object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}

export default JournalPanel
