import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Modal from './Modal'

interface Item {
  id: string
  user_id: string
  type: string
  title: string
  event_date: string
  attachment_url: string
}

const IMG = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i
const TYPE_COLORS: Record<string, string> = {
  event: '#77BA68',
  task: '#E6CA6E',
  holiday: '#B0A5A5',
  note: '#DE9E9E',
}

function GalleryPanel({ open }: { open: boolean }) {
  const [items, setItems] = useState<Item[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Item | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      const [{ data }, { data: profs }] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('id, user_id, type, title, event_date, attachment_url')
          .not('attachment_url', 'is', null)
          .order('event_date', { ascending: false }),
        supabase.from('profiles').select('id, name'),
      ])
      if (cancelled) return
      setItems((data ?? []) as Item[])
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

  const shown = items.filter((i) => filter === 'all' || i.type === filter)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {['all', 'event', 'task', 'holiday', 'note'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`btn btn-sm capitalize ${filter === t ? 'btn-primary' : 'btn-ghost'}`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto self-center text-xs t-muted">{shown.length} items</span>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm t-muted text-center py-10">
          No photos or files yet. Attach one when you add something to your calendar.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {shown.map((it) => (
            <button
              key={it.id}
              onClick={() => setSelected(it)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-(--g-border) bg-(--g-input)"
            >
              {IMG.test(it.attachment_url) ? (
                <img
                  src={it.attachment_url}
                  alt={it.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-2xl">
                  📎
                  <span className="text-[10px] t-muted uppercase">
                    {it.attachment_url.split('.').pop()?.split('?')[0]}
                  </span>
                </div>
              )}
              <span
                className="absolute top-1.5 left-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white/70"
                style={{ backgroundColor: TYPE_COLORS[it.type] }}
              />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-left text-[11px] font-semibold text-white truncate">
                {it.title}
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal open={selected !== null} onClose={() => setSelected(null)} className="max-w-lg">
        {selected && (
          <div className="flex flex-col gap-3">
            {IMG.test(selected.attachment_url) ? (
              <img src={selected.attachment_url} alt={selected.title} className="max-h-[55vh] w-full rounded-xl object-contain" />
            ) : (
              <p className="text-center text-4xl py-6">📎</p>
            )}
            <div>
              <p className="font-bold text-lg">{selected.title}</p>
              <p className="text-xs opacity-70">
                {selected.event_date} · {selected.type} · by {names[selected.user_id] || 'Someone'}
              </p>
            </div>
            <div className="flex justify-between">
              <a href={selected.attachment_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                Open original
              </a>
              <button onClick={() => setSelected(null)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default GalleryPanel
