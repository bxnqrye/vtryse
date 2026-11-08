import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

interface Note {
  id: string
  user_id: string
  text: string
  created_at: string
}

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NoteBoard() {
  const [meId, setMeId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const [{ data: ns }, { data: profs }] = await Promise.all([
        supabase
          .from('shared_notes')
          .select('id, user_id, text, created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('profiles').select('id, name'),
      ])
      if (cancelled) return

      setMeId(user.id)
      setNotes((ns ?? []) as Note[])
      const map: Record<string, string> = {}
      ;(profs ?? []).forEach((p) => {
        map[p.id] = p.name || 'Someone'
      })
      setNames(map)
      setNow(Date.now())
    }

    load()
    const channel = supabase
      .channel('shared_notes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_notes' }, () => {
        load()
      })
      .subscribe()
    const timer = setInterval(() => setNow(Date.now()), 60000)

    return () => {
      cancelled = true
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  const post = async () => {
    const text = draft.trim()
    if (!text || !meId) return
    const { data, error } = await supabase
      .from('shared_notes')
      .insert({ user_id: meId, text })
      .select('id, user_id, text, created_at')
      .single()
    if (error) return setErr(error.message)
    setErr('')
    setDraft('')
    setNotes((prev) => [data as Note, ...prev])
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('shared_notes').delete().eq('id', id)
    if (!error) setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="glass-soft px-4 py-3 w-full sm:w-72 shrink-0 h-[406px] flex flex-col overflow-hidden">
      <p className="g-label mb-2">Notes</p>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          maxLength={280}
          placeholder="Leave a note…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') post()
          }}
          className="glass-input flex-1 min-w-0"
        />
        <button onClick={post} className="btn btn-primary btn-sm shrink-0">
          Post
        </button>
      </div>
      {err && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{err}</p>}

      <ul className="soft-scroll space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {notes.length === 0 && <li className="text-xs t-muted">No notes yet.</li>}
        {notes.map((n) => (
          <li key={n.id} className="text-sm leading-snug">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold t-accent truncate">{names[n.user_id] || 'Someone'}</span>
              <span className="text-[11px] t-muted shrink-0">
                {timeAgo(n.created_at, now)}
                {n.user_id === meId && (
                  <button
                    onClick={() => remove(n.id)}
                    title="Delete"
                    className="ml-2 hover:text-(--g-danger)"
                  >
                    ✕
                  </button>
                )}
              </span>
            </div>
            <p className="break-words">{n.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NoteBoard
