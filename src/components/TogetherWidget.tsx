import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import { onEnter } from '../utils/keys'

interface Member {
  id: string
  name: string | null
  avatar_url: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')
function toLocalInput(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Avatar({ m }: { m: Member }) {
  const cls = 'w-11 h-11 rounded-full ring-2 ring-(--h-pink) shadow-[0_0_14px_var(--h-glow)] shrink-0'
  return m.avatar_url ? (
    <img src={m.avatar_url} alt={m.name ?? ''} title={m.name ?? ''} className={`${cls} object-cover`} />
  ) : (
    <div
      title={m.name ?? ''}
      className={`${cls} bg-(--g-accent) text-white flex items-center justify-center font-bold`}
    >
      {(m.name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

function TogetherWidget() {
  const [meId, setMeId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [note, setNote] = useState('Been together')
  const [start, setStart] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const [open, setOpen] = useState(false)
  const [draftNote, setDraftNote] = useState('')
  const [draftStart, setDraftStart] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, counter_note, counter_start')
      if (cancelled || !data) return

      setMeId(user.id)
      const sorted = [...data].sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0))
      setMembers(sorted.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })))
      const mine = data.find((p) => p.id === user.id)
      if (mine?.counter_start) setStart(mine.counter_start)
      if (mine?.counter_note) setNote(mine.counter_note)
    }

    load()
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const openEditor = () => {
    setDraftNote(note)
    setDraftStart(start ? toLocalInput(start) : '')
    setErr('')
    setOpen(true)
  }

  const save = async () => {
    if (!meId) return
    if (!draftStart) {
      setErr('Pick a date and time')
      return
    }
    const iso = new Date(draftStart).toISOString()
    const text = draftNote.trim() || 'Been together'
    const { error } = await supabase
      .from('profiles')
      .update({ counter_note: text, counter_start: iso })
      .eq('id', meId)
    if (error) {
      setErr(error.message)
      return
    }
    setNote(text)
    setStart(iso)
    setOpen(false)
  }

  const diff = start ? Math.max(0, now - new Date(start).getTime()) : 0
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)

  return (
    <div className="glass-soft relative px-6 py-4 text-center min-w-[15rem] self-start">
      <button
        onClick={openEditor}
        title="Edit"
        className="absolute top-2 right-3 t-muted hover:text-(--h-pink) text-sm"
      >
        ✎
      </button>

      {members.length > 0 && (
        <div className="flex items-center justify-center mb-2">
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center">
              {i > 0 && <span className="together-link" />}
              <Avatar m={m} />
            </div>
          ))}
        </div>
      )}

      {start ? (
        <>
          <p className="text-sm t-muted">{note}</p>
          <p className="text-3xl font-bold leading-tight text-(--h-pink) [text-shadow:0_0_18px_var(--h-glow)]">
            {days} {days === 1 ? 'day' : 'days'}
          </p>
          <p className="text-lg font-semibold">{hours.toLocaleString()} hours</p>
        </>
      ) : (
        <button onClick={openEditor} className="btn btn-primary mt-1">
          Start a counter
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3 text-left" onKeyDown={onEnter(save)}>
          <p className="text-lg font-semibold">Counter</p>
          <input
            type="text"
            placeholder="Been together"
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            className="glass-input"
          />
          <input
            type="datetime-local"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            className="glass-input"
          />
          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={save} className="btn btn-primary btn-sm">
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TogetherWidget
