import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import { onEnter } from '../utils/keys'

interface Member {
  id: string
  name: string | null
  avatar_url: string | null
}
interface Counter {
  id: string
  user_id: string
  note: string
  start_at: string
}

// '' = no icon on the connector
const ICONS = ['♥', '★', '✦', '∞', '♪', '☺', '✿', '🤝', '⚡', '']

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
  const [counters, setCounters] = useState<Counter[]>([])
  const [icon, setIcon] = useState('♥')
  const [now, setNow] = useState(() => Date.now())

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [draftStart, setDraftStart] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const [{ data: profs }, { data: cs }] = await Promise.all([
        supabase.from('profiles').select('id, name, avatar_url, link_icon'),
        supabase
          .from('counters')
          .select('id, user_id, note, start_at')
          .order('created_at', { ascending: true }),
      ])
      if (cancelled) return

      setMeId(user.id)
      const list = (profs ?? []) as (Member & { link_icon: string | null })[]
      list.sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0))
      setMembers(list.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })))
      const mine = list.find((p) => p.id === user.id)
      if (mine && mine.link_icon !== null) setIcon(mine.link_icon)
      setCounters((cs ?? []) as Counter[])
    }

    load()
    // Live updates: when someone adds / edits / deletes a counter, everyone sees it
    const channel = supabase
      .channel('counters_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'counters' }, () => {
        load()
      })
      .subscribe()
    const timer = setInterval(() => setNow(Date.now()), 30000)

    return () => {
      cancelled = true
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  const openNew = () => {
    setEditingId(null)
    setDraftNote('Been together')
    setDraftStart(toLocalInput(new Date().toISOString()))
    setErr('')
    setOpen(true)
  }

  const openEdit = (c: Counter) => {
    setEditingId(c.id)
    setDraftNote(c.note)
    setDraftStart(toLocalInput(c.start_at))
    setErr('')
    setOpen(true)
  }

  const save = async () => {
    if (!meId) return
    if (!draftStart) {
      setErr('Pick a date and time')
      return
    }
    const payload = {
      note: draftNote.trim() || 'Been together',
      start_at: new Date(draftStart).toISOString(),
    }

    if (editingId) {
      const { error } = await supabase.from('counters').update(payload).eq('id', editingId)
      if (error) return setErr(error.message)
      setCounters((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c)))
    } else {
      const { data, error } = await supabase
        .from('counters')
        .insert({ ...payload, user_id: meId })
        .select('id, user_id, note, start_at')
        .single()
      if (error) return setErr(error.message)
      setCounters((prev) => [...prev, data as Counter])
    }
    setOpen(false)
  }

  const remove = async () => {
    if (!editingId) return
    const { error } = await supabase.from('counters').delete().eq('id', editingId)
    if (error) return setErr(error.message)
    setCounters((prev) => prev.filter((c) => c.id !== editingId))
    setOpen(false)
  }

  const pickIcon = async (value: string) => {
    setIcon(value)
    if (meId) await supabase.from('profiles').update({ link_icon: value }).eq('id', meId)
  }

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name || 'Someone'

  return (
    <div className="glass-soft relative isolate px-7 py-8 text-center w-full sm:w-72 shrink-0 h-[406px] flex flex-col overflow-hidden">
     
      {/* Single roaming blood droplet */}
      <svg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox="0 0 300 406"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="bloodGlow" x="-500%" y="-500%" width="1100%" height="1100%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Faint connected paths */}
        <g
          stroke="var(--h-pink)"
          strokeWidth="1"
          opacity="0.15"
        >
          <path
            id="bloodPath"
            d="M-20 85 C55 35 90 145 155 105 S245 55 320 115
              C350 160 270 180 220 185
              C175 190 125 290 85 325
              C55 355 110 375 175 335
              S255 285 320 345"
          />
        </g>

        {/* One glowing droplet */}
        <circle
          r="3.5"
          fill="#ff8bb5"
          filter="url(#bloodGlow)"
        >
          <animateMotion
            dur="16s"
            repeatCount="indefinite"
            rotate="auto"
            path="M-20 85 C55 35 90 145 155 105 S245 55 320 115
                  C350 160 270 180 220 185
                  C175 190 125 290 85 325
                  C55 355 110 375 175 335
                  S255 285 320 345"
          />
        </circle>
      </svg>

      {members.length > 0 && (
        <div className="flex items-center justify-center mb-3">
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center">
              {i > 0 && (
                <span
                  className="together-link"
                  style={{ '--link-icon': `"${icon}"` } as CSSProperties}
                />
              )}
              <Avatar m={m} />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4 max-h-64 soft-scroll pr-1">
        {counters.map((c) => {
          const diff = Math.max(0, now - new Date(c.start_at).getTime())
          const days = Math.floor(diff / 86400000)
          const hours = Math.floor(diff / 3600000)
          const mine = c.user_id === meId
          return (
            <div key={c.id} className="relative">
              {mine && (
                <button
                  onClick={() => openEdit(c)}
                  title="Edit"
                  className="absolute top-0 right-0 t-muted hover:text-(--h-pink) text-sm"
                >
                  ✎
                </button>
              )}
              <p className="text-sm t-muted px-5 truncate">
                {c.note}
                {!mine && ` · ${nameOf(c.user_id)}`}
              </p>
              <p className="text-[22px] font-bold leading-tight text-(--h-pink) [text-shadow:0_0_18px_var(--h-glow)]">
                {days} {days === 1 ? 'day' : 'days'}
              </p>
              <p className="text-[15px] font-semibold">{hours.toLocaleString()} hours</p>
            </div>
          )
        })}
      </div>

      <button onClick={openNew} className="font-bold btn btn-ghost btn-sm mt-3 shrink-0">
        + {counters.length === 0 ? 'Start a counter' : 'Add another'}
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3 text-left" onKeyDown={onEnter(save)}>
          <p className="text-lg font-semibold">{editingId ? 'Edit counter' : 'New counter'}</p>
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

          <div>
            <p className="text-xs opacity-70 mb-1.5">Connector icon between avatars</p>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((ic) => (
                <button
                  key={ic || 'none'}
                  type="button"
                  onClick={() => pickIcon(ic)}
                  className={`min-w-9 h-9 px-2 rounded-lg border text-base transition ${
                    icon === ic
                      ? 'bg-(--g-accent) text-white border-white/30'
                      : 'border-black/15 dark:border-white/15 hover:bg-(--g-hover)'
                  }`}
                >
                  {ic || 'none'}
                </button>
              ))}
            </div>
          </div>

          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex gap-2 justify-between">
            {editingId ? (
              <button onClick={remove} className="btn btn-ghost btn-sm !text-(--g-danger)">
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
                Cancel
              </button>
              <button onClick={save} className="btn btn-primary btn-sm">
                Save
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TogetherWidget
